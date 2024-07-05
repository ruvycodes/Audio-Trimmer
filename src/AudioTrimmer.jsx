import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import EnvelopePlugin from 'wavesurfer.js/dist/plugins/envelope.esm.js';
import useEncode from './hooks/useEncode';
import useTrimAudio from './hooks/useTrimAudio';
import useMergeAudio from './hooks/useMergeAudio';
import TrimmedAudioTable from './TrimmedAudioTable';
import useApplyEnvelopeToAudio from './hooks/useApplyEnvelopeToAudio';

const AudioTrimmer = () => {
    const [zoomLevel, setZoomLevel] = useState(15);
    const [pauseFlag, setPauseFlag] = useState(true);
    const [trimmedAudios, setTrimmedAudios] = useState([]);
    const [mergedAudioURL, setMergedAudioURL] = useState(null);
    const [modifiedAudioURL, setModifiedAudioURL] = useState(null); // State for modified audio URL
    const [audioDuration, setAudioDuration] = useState(0);
    const envelopeRef = useRef(null);
    const containerRef = useRef(null);
    const wavesurferRef = useRef(null);
    const zoomRef = useRef(null);
    const selectedRegionRef = useRef(null);
    const regionAudioMapRef = useRef(new Map()); // Mapping of regions to audio URLs

    useEffect(() => {
        // Create an instance of WaveSurfer
        wavesurferRef.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: 'rgb(200, 0, 200)',
            progressColor: 'rgb(100, 0, 100)',
            responsive: true,
            backend: 'WebAudio',
            url: '/src/vocals.wav',
            barWidth: 3,
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

        // Set the duration of the track once it is loaded
        wavesurferRef.current.on('ready', () => {
            setAudioDuration(wavesurferRef.current.getDuration());
        });

        envelopeRef.current = wavesurferRef.current.registerPlugin(
            EnvelopePlugin.create({
                volume: 1,
                lineColor: 'rgba(255, 0, 0, 0.5)',
                lineWidth: 4,
                dragPointSize: window.innerWidth <= 768 ? 20 : 12,
                dragLine: window.innerWidth > 768,
                dragPointFill: 'rgba(0, 255, 255, 0.8)',
                dragPointStroke: 'rgba(0, 0, 0, 0.5)',
            })
        );

        wsRegions.on('region-created', (region) => {
            selectedRegionRef.current = region;
            console.log('Region created:', region.start, region.end);
            // Trim audio and add to trimmed audios list
            trimAndAddAudio(region.start, region.end, region);
        });

        return () => {
            wavesurferRef.current.destroy();
            envelopeRef.current.destroy();
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
        const trimmedAudioBuffer = await useTrimAudio(url, start, end);
        const trimmedAudioBlob = useEncode(trimmedAudioBuffer);
        const trimmedAudioURL = URL.createObjectURL(trimmedAudioBlob);
        setTrimmedAudios((prevAudios) => [...prevAudios, { url: trimmedAudioURL, selected: false }]);
        regionAudioMapRef.current.set(trimmedAudioURL, region); // Map the trimmed audio URL to the region
    };

    const handleCheckboxChange = (index) => {
        const updatedAudios = [...trimmedAudios];
        updatedAudios[index].selected = !updatedAudios[index].selected;
        setTrimmedAudios(updatedAudios);
    };

    const handleVolumeAutomation = () => {
        envelopeRef.current.addPoint({ time: audioDuration / 2, volume: 0.9 });
    };

    const handleMergeSelected = async () => {
        setMergedAudioURL(null); // Clear previous merged audio
        const selectedUrls = trimmedAudios.filter((audio) => audio.selected).map((audio) => audio.url);
        if (selectedUrls.length > 1) {
            const mergedAudioBlob = await useMergeAudio(selectedUrls);
            const mergedAudioURL = URL.createObjectURL(mergedAudioBlob);
            setMergedAudioURL(mergedAudioURL);
        }
    };

    const createWobbleEffect = () => {
        const points = [];
        for (let i = 0; i <= audioDuration; i = i + 0.125) {
            points.push({
                time: i,
                volume: i % 0.25 === 0 ? 1 : 0,
            });
        }
        envelopeRef.current.setPoints(points);
    };

    const handleGetModifiedAudio = async () => {
        const originalAudioURL = '/src/Tragedy.wav'; // Original audio URL
        const modifiedAudioBuffer = await useApplyEnvelopeToAudio(originalAudioURL , envelopeRef);
        const modifiedAudioBlob = useEncode(modifiedAudioBuffer);
        const modifiedAudioURL = URL.createObjectURL(modifiedAudioBlob);
        setModifiedAudioURL(modifiedAudioURL); // Set state to update the audio element
    };
    
    return (
        <>
            <div ref={containerRef}></div>
            <input ref={zoomRef} onChange={handleZoom} type="range" min="10" max="1200" value={zoomLevel} />
            <button onClick={handlePause}>{pauseFlag ? 'Play' : 'Pause'}</button>
            <button onClick={handleMergeSelected}>Merge Selected</button>
            <button onClick={handleVolumeAutomation}>Volume Automation</button>
            <button onClick={createWobbleEffect}>Wobble</button>
            <button onClick={handleGetModifiedAudio}>Get Modified Audio</button>
            <TrimmedAudioTable trimmedAudios={trimmedAudios} handleCheckboxChange={handleCheckboxChange} handleRemoveAudio={handleRemoveAudio} />
            {mergedAudioURL && (
                <audio controls>
                    <source src={mergedAudioURL} type="audio/wav" />
                </audio>
            )}
            {modifiedAudioURL && (
                <audio controls>
                    <source src={modifiedAudioURL} type="audio/wav" />
                </audio>
            )}
        </>
    );
};

export default AudioTrimmer;
