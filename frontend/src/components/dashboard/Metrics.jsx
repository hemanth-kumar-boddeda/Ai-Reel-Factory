import { useEffect, useState } from 'react';

export default function Metrics({ stats }) {
  // Convert stats object to an array of entries for easier mapping
  const statsEntries = Object.entries(stats);

  return (
    <div className="metrics-bar">
      {statsEntries.map(([status, count]) => (
        <div key={status} className="metric">
          <h3>{status}</h3>
          <p>{count}</p>
        </div>
      ))}
    </div>
  );
}