import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import useEncode from './hooks/useEncode';
import useTrimAudio from './hooks/useTrimAudio';
import useMergeAudio from './hooks/useMergeAudio';
import TrimmedAudioTable from './TrimmedAudioTable';

const AudioTrimmer = () => {
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

    const handleMergeSelected = async () => {
        setMergedAudioURL(null) // we are doing this to clear the merged audio element before creating the new merged audio , it fixes the bug where user coulf not merge audio after merging it one time as the old merged audio element was not being cleared
        const selectedUrls = trimmedAudios.filter((audio) => audio.selected).map((audio) => audio.url);
        if (selectedUrls.length > 1) {
            const mergedAudioBlob = await useMergeAudio(selectedUrls);
            const mergedAudioURL = URL.createObjectURL(mergedAudioBlob);
            setMergedAudioURL(mergedAudioURL);
        }
    };

    return (
        <>
            <div ref={containerRef}></div>
            <input ref={zoomRef} onChange={handleZoom} type="range" min="10" max="1200" value={zoomLevel} />
            <button onClick={handlePause}>{pauseFlag ? 'Play' : 'Pause'}</button>
            <button onClick={handleMergeSelected}>Merge Selected</button>
            <TrimmedAudioTable trimmedAudios={trimmedAudios} handleCheckboxChange={handleCheckboxChange} handleRemoveAudio={handleRemoveAudio} />
            {mergedAudioURL && (
                <audio controls>
                    <source src={mergedAudioURL} type="audio/wav" />
                </audio>
            )}
        </>
    );
};

export default AudioTrimmer;