function TrackList({ tracks, trackGroup }) {
  return (
    <ul>
      {tracks.map((track) => (
        <li key={track.id}>
          {track.title}
          <button onClick={() => handleBuySingle(track.id)}>Buy Single</button>
        </li>
      ))}
    </ul>
  );
}

function handleBuySingle(trackId: number) {
  // Call API to purchase single track
  api.post(`/v1/tracks/${trackId}/purchase`, { /* payment details */ })
    .then(response => {
      // Handle successful purchase
    })
    .catch(error => {
      // Handle error
    });
}