import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

const TrimAudio = () => {
    const [zoomLevel, setZoomLevel] = useState(15);
    const [pauseFlag, setPauseFlag] = useState(true);
    const containerRef = useRef(null);
    const wavesurferRef = useRef(null);
    const zoomRef = useRef(null);
    const selectedRegionRef = useRef(null);
    const [trimmedAudios, setTrimmedAudios] = useState([]);
    const [mergedAudioURL, setMergedAudioURL] = useState(null);
    const regionAudioMapRef = useRef(new Map()); // Mapping of regions to audio URLs

    useEffect(() => {
        // Create an instance of WaveSurfer
        wavesurferRef.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: 'rgb(200, 0, 200)',
            progressColor: 'rgb(100, 0, 100)',
            responsive: true,
            url: '/src/Tragedy.wav',
            barWidth:3,
            barGap: 2,
            barRadius: 2,
            height: 90
        });

        // Initialize the Regions plugin
        const wsRegions = wavesurferRef.current.registerPlugin(RegionsPlugin.create());

        wsRegions.enableDragSelection({
            color: 'rgba(255, 0, 0, 0.1)',
        });

        wsRegions.on('region-clicked', (region, e) => {
            e.stopPropagation();
            setPauseFlag(!pauseFlag);
            selectedRegionRef.current = region;
            region.play();
        });

        wsRegions.on('region-created', (region) => {
            selectedRegionRef.current = region;
            console.log('Region created:', region.start, region.end);
            // Trim audio and add to trimmed audios list
            trimAndAddAudio(region.start, region.end, region);
        });

        return () => {
            wavesurferRef.current.destroy();
        };
    }, []);

    const handleZoom = () => {
        setZoomLevel(zoomRef.current.value);
        wavesurferRef.current.zoom(zoomLevel);
    };

    const handlePause = () => {
        setPauseFlag(!pauseFlag);
        if (pauseFlag) {
            wavesurferRef.current.play();
        } else {
            wavesurferRef.current.pause();
        }
    };

    const handleRemoveAudio = (audioUrl) => {
        // Remove the audio from the table and its corresponding region
        setTrimmedAudios((prevAudios) => prevAudios.filter((audio) => audio.url !== audioUrl));
        const region = regionAudioMapRef.current.get(audioUrl);
        if (region) {
            region.remove();
            regionAudioMapRef.current.delete(audioUrl);
        }
    };

    const trimAndAddAudio = async (start, end, region) => {
        const url = '/src/Tragedy.wav'; // Original audio URL
        const trimmedAudioBuffer = await trimAudio(url, start, end);
        const trimmedAudioBlob = audioBufferToWavBlob(trimmedAudioBuffer);
        const trimmedAudioURL = URL.createObjectURL(trimmedAudioBlob);
        setTrimmedAudios((prevAudios) => [...prevAudios, { url: trimmedAudioURL, selected: false }]);
        regionAudioMapRef.current.set(trimmedAudioURL, region); // Map the trimmed audio URL to the region
    };

    const handleCheckboxChange = (index) => {
        const updatedAudios = [...trimmedAudios];
        updatedAudios[index].selected = !updatedAudios[index].selected;
        setTrimmedAudios(updatedAudios);
    };

    const handleMergeSelected = async () => {
        const selectedUrls = trimmedAudios.filter((audio) => audio.selected).map((audio) => audio.url);
        if (selectedUrls.length > 1) {
            const mergedAudioBlob = await mergeAudio(selectedUrls);
            const mergedAudioURL = URL.createObjectURL(mergedAudioBlob);
            setMergedAudioURL(mergedAudioURL);
        }
    };

    const trimAudio = async (url, start, end) => {
        const audioContext = new AudioContext();
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const startSample = Math.floor(start * audioBuffer.sampleRate);
        const endSample = Math.floor(end * audioBuffer.sampleRate);
        const frameCount = endSample - startSample;

        const trimmedBuffer = audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            frameCount,
            audioBuffer.sampleRate
        );

        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            const channelData = audioBuffer.getChannelData(i);
            trimmedBuffer.copyToChannel(channelData.subarray(startSample, endSample), i);
        }

        return trimmedBuffer;
    };

    const audioBufferToWavBlob = (audioBuffer) => {
        const numOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numOfChannels * 2 + 44;
        const buffer = new ArrayBuffer(length);
        const view = new DataView(buffer);

        let offset = 0;
        const writeString = (str) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
            offset += str.length;
        };

        // RIFF identifier
        writeString('RIFF');
        view.setUint32(offset, 36 + audioBuffer.length * numOfChannels * 2, true);
        offset += 4;

        // RIFF type
        writeString('WAVE');

        // Format chunk identifier
        writeString('fmt ');
        view.setUint32(offset, 16, true);
        offset += 4;

        // Format code
        view.setUint16(offset, 1, true);
        offset += 2;

        // Number of channels
        view.setUint16(offset, numOfChannels, true);
        offset += 2;

        // Sample rate
        view.setUint32(offset, audioBuffer.sampleRate, true);
        offset += 4;

        // Byte rate
        view.setUint32(offset, audioBuffer.sampleRate * numOfChannels * 2, true);
        offset += 4;

        // Block align
        view.setUint16(offset, numOfChannels * 2, true);
        offset += 2;

        // Bits per sample
        view.setUint16(offset, 16, true);
        offset += 2;

        // Data chunk identifier
        writeString('data');
        view.setUint32(offset, audioBuffer.length * numOfChannels * 2, true);
        offset += 4;

        // Write audio data
        for (let i = 0; i < audioBuffer.length; i++) {
            for (let channel = 0; channel < numOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([buffer], { type: 'audio/wav' });
    };

    const mergeAudio = async (audioList) => {
        const audioContext = new AudioContext();
        const decodedBuffers = [];

        for (const audioUrl of audioList) {
            const response = await fetch(audioUrl);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            decodedBuffers.push(audioBuffer);
        }

        const totalLength = decodedBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
        const mergedBuffer = audioContext.createBuffer(
            decodedBuffers[0].numberOfChannels,
            totalLength,
            decodedBuffers[0].sampleRate
        );

        let offset = 0;
        for (const buffer of decodedBuffers) {
            for (let channel = 0; channel < mergedBuffer.numberOfChannels; channel++) {
                mergedBuffer.copyToChannel(buffer.getChannelData(channel), channel, offset);
            }
            offset += buffer.length;
        }

        return audioBufferToWavBlob(mergedBuffer); // Convert merged buffer to Blob
    };

    return (
        <>
            <div ref={containerRef}></div>
            <input ref={zoomRef} onChange={handleZoom} type="range" min="10" max="1200" value={zoomLevel} />
            <button onClick={handlePause}>{pauseFlag ? 'Play' : 'Pause'}</button>
            <button onClick={handleMergeSelected}>Merge Selected</button>
            <table>
                <thead>
                    <tr>
                        <th>Select</th>
                        <th>Audio</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {trimmedAudios.map((audio, index) => (
                        <tr key={index}>
                            <td>
                                <input
                                    type="checkbox"
                                    checked={audio.selected}
                                    onChange={() => handleCheckboxChange(index)}
                                />
                            </td>
                            <td>
                                <audio controls>
                                    <source src={audio.url} type="audio/wav" />
                                </audio>
                            </td>
                            <td>
                                <button onClick={() => handleRemoveAudio(audio.url)}>Remove</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {mergedAudioURL && (
                <audio controls>
                    <source src={mergedAudioURL} type="audio/wav" />
                </audio>
            )}
        </>
    );
};

export default TrimAudio;
