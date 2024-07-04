const TrimmedAudioTable = ({trimmedAudios , handleCheckboxChange , handleRemoveAudio})=> {

    return(
        <>
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
        </>
    )
}

export default TrimmedAudioTable