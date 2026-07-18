const fs = require('node:fs');
const path = require('node:path');

const { loadImportPackManifest } = require('../workflows/import-pack');
const { writeStoreZip } = require('./zip-store');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseSeconds(value, name = 'time') {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const text = String(value).trim();
  const clock = text.match(/^(\d{1,2}):(\d{2})(?:\.(\d+))?$/);
  if (clock) {
    return (Number(clock[1]) * 60) + Number(clock[2]) + Number(`0.${clock[3] || '0'}`);
  }
  const seconds = Number(text);
  if (!Number.isFinite(seconds)) {
    throw new Error(`invalid ${name}: ${value}`);
  }
  return seconds;
}

function formatSeconds(value) {
  if (!Number.isFinite(value)) {
    throw new Error(`invalid seconds value: ${value}`);
  }
  return Number(value.toFixed(6)).toString();
}

function safeFileName(name, fallback) {
  const cleaned = path.basename(name)
    .replace(/[^a-zA-Z0-9._ -]+/g, '_')
    .replace(/^\.+/, '')
    .trim();
  return cleaned || fallback;
}

function readWavInfo(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`only WAV media is supported by DAWproject export v0: ${file}`);
  }

  let offset = 12;
  let sampleRate = null;
  let channels = null;
  let bitsPerSample = null;
  let dataBytes = null;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkId === 'fmt ') {
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    } else if (chunkId === 'data') {
      dataBytes = chunkSize;
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (!sampleRate || !channels || !bitsPerSample || dataBytes === null) {
    throw new Error(`invalid WAV media: ${file}`);
  }
  const bytesPerFrame = channels * (bitsPerSample / 8);
  return {
    sampleRate,
    channels,
    duration: dataBytes / bytesPerFrame / sampleRate,
  };
}

function idFactory() {
  let next = 0;
  return (prefix) => `${prefix}${next += 1}`;
}

function groupedAssets(manifest) {
  return manifest.tracks.map((track) => ({
    track,
    assets: manifest.assets.filter((asset) => asset.trackName === track.name),
  }));
}

function mediaPathFor(asset, usedNames) {
  const ext = path.extname(asset.path) || '.wav';
  const base = safeFileName(`${asset.id || path.basename(asset.path, ext)}${ext}`, `audio${usedNames.size + 1}${ext}`);
  let candidate = base;
  let index = 1;
  while (usedNames.has(candidate)) {
    candidate = `${path.basename(base, ext)}-${index}${ext}`;
    index += 1;
  }
  usedNames.add(candidate);
  return `audio/${candidate}`;
}

function buildDawprojectXml(manifest, mediaByAssetId) {
  const id = idFactory();
  const masterTrackId = id('id');
  const masterChannelId = id('id');
  const trackGroups = groupedAssets(manifest).map((group) => ({
    ...group,
    trackId: id('id'),
    channelId: id('id'),
  }));

  const structureTracks = trackGroups.map(({ track, trackId, channelId }) => [
    `    <Track contentType="audio" loaded="true" id="${trackId}" name="${escapeXml(track.name)}">`,
    `      <Channel audioChannels="${track.outputChannels || 2}" destination="${masterChannelId}" role="regular" solo="false" id="${channelId}">`,
    `        <Mute value="false" id="${id('id')}" name="Mute"/>`,
    `        <Pan max="1.000000" min="0.000000" unit="normalized" value="0.500000" id="${id('id')}" name="Pan"/>`,
    `        <Volume max="2.000000" min="0.000000" unit="linear" value="1.000000" id="${id('id')}" name="Volume"/>`,
    '      </Channel>',
    '    </Track>',
  ].join('\n')).join('\n');

  const lanes = trackGroups.map(({ trackId, assets }) => {
    const clipLines = assets.map((asset) => {
      const media = mediaByAssetId.get(asset.id);
      const start = parseSeconds(asset.start, `${asset.id}.start`);
      const sourceStart = asset.sourceStart === undefined ? 0 : parseSeconds(asset.sourceStart, `${asset.id}.sourceStart`);
      const duration = asset.duration === undefined ? Math.max(0, media.duration - sourceStart) : parseSeconds(asset.duration, `${asset.id}.duration`);
      const playStop = sourceStart + duration;
      const clipId = id('id');
      const audioId = id('id');
      return [
        `          <Clip time="${formatSeconds(start)}" duration="${formatSeconds(duration)}" contentTimeUnit="seconds" playStart="${formatSeconds(sourceStart)}" playStop="${formatSeconds(playStop)}" name="${escapeXml(asset.regionName)}">`,
        `            <Audio algorithm="raw" channels="${media.channels}" duration="${formatSeconds(media.duration)}" sampleRate="${media.sampleRate}" id="${audioId}">`,
        `              <File path="${escapeXml(media.packagePath)}"/>`,
        '            </Audio>',
        '          </Clip>',
      ].join('\n');
    }).join('\n');
    return [
      `      <Lanes track="${trackId}" id="${id('id')}">`,
      `        <Clips id="${id('id')}">`,
      clipLines,
      '        </Clips>',
      '      </Lanes>',
    ].join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Project version="1.0">',
    '  <Application name="SIANN" version="0.1.0"/>',
    '  <Transport>',
    '    <Tempo max="666.000000" min="20.000000" unit="bpm" value="120.000000" id="tempo" name="Tempo"/>',
    '    <TimeSignature denominator="4" numerator="4" id="time_signature"/>',
    '  </Transport>',
    '  <Structure>',
    structureTracks,
    `    <Track contentType="audio notes" loaded="true" id="${masterTrackId}" name="Master">`,
    `      <Channel audioChannels="2" role="master" solo="false" id="${masterChannelId}">`,
    `        <Mute value="false" id="${id('id')}" name="Mute"/>`,
    `        <Pan max="1.000000" min="0.000000" unit="normalized" value="0.500000" id="${id('id')}" name="Pan"/>`,
    `        <Volume max="2.000000" min="0.000000" unit="linear" value="1.000000" id="${id('id')}" name="Volume"/>`,
    '      </Channel>',
    '    </Track>',
    '  </Structure>',
    `  <Arrangement id="${id('id')}">`,
    `    <Lanes timeUnit="seconds" id="${id('id')}">`,
    lanes,
    `      <Lanes track="${masterTrackId}" id="${id('id')}">`,
    `        <Clips id="${id('id')}"/>`,
    '      </Lanes>',
    '    </Lanes>',
    '  </Arrangement>',
    '  <Scenes/>',
    '</Project>',
    '',
  ].join('\n');
}

function buildMetadataXml(manifest) {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<MetaData>',
    `  <Title>${escapeXml(manifest.session.name)}</Title>`,
    '  <Producer>SIANN</Producer>',
    '  <Comment>Generated by SIANN DAWproject export v0.</Comment>',
    '</MetaData>',
    '',
  ].join('\n');
}

function buildDawprojectPackage(manifest) {
  const usedMediaNames = new Set();
  const mediaByAssetId = new Map();
  const mediaEntries = manifest.assets.map((asset) => {
    const packagePath = mediaPathFor(asset, usedMediaNames);
    const info = readWavInfo(asset.path);
    mediaByAssetId.set(asset.id, { ...info, packagePath });
    return {
      name: packagePath,
      data: fs.readFileSync(asset.path),
    };
  });

  return {
    entries: [
      { name: 'project.xml', data: buildDawprojectXml(manifest, mediaByAssetId) },
      { name: 'metadata.xml', data: buildMetadataXml(manifest) },
      ...mediaEntries,
    ],
    media: [...mediaByAssetId.values()],
  };
}

function writeDawprojectExport(manifestFile, outFile) {
  const absoluteManifestFile = path.resolve(manifestFile);
  const absoluteOutFile = path.resolve(outFile);
  const manifest = loadImportPackManifest(absoluteManifestFile);
  const dawproject = buildDawprojectPackage(manifest);
  writeStoreZip(absoluteOutFile, dawproject.entries);
  return {
    ok: true,
    workflow: 'export-dawproject',
    manifestFile: absoluteManifestFile,
    outputFile: absoluteOutFile,
    entryCount: dawproject.entries.length,
    mediaCount: dawproject.media.length,
  };
}

module.exports = {
  buildDawprojectPackage,
  buildDawprojectXml,
  buildMetadataXml,
  parseSeconds,
  readWavInfo,
  writeDawprojectExport,
};

