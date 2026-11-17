import { fmt } from "../lib/clock";
import { totalOf } from "../lib/data";

/** Edit a list of { name, duration_s } segments. */
export default function SegmentEditor({ segments, onChange }) {
  const set = (i, patch) => onChange(segments.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= segments.length) return;
    const copy = [...segments];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };
  const remove = (i) => onChange(segments.filter((_, j) => j !== i));
  const add = () => onChange([...segments, { name: "", duration_s: 300 }]);

  return (
    <div className="seg-editor">
      <div className="seg-head muted small"><span>#</span><span>Segment</span><span>Min</span><span>Sec</span><span /></div>
      {segments.map((s, i) => (
        <div className="seg-row" key={i}>
          <span className="muted">{i + 1}</span>
          <input value={s.name} placeholder="e.g. Praise & Worship" onChange={(e) => set(i, { name: e.target.value })} />
          <input type="number" min="0" max="600" value={Math.floor(s.duration_s / 60)}
            onChange={(e) => set(i, { duration_s: Math.max(0, +e.target.value || 0) * 60 + (s.duration_s % 60) })} />
          <input type="number" min="0" max="59" value={s.duration_s % 60}
            onChange={(e) => set(i, { duration_s: Math.floor(s.duration_s / 60) * 60 + Math.min(59, Math.max(0, +e.target.value || 0)) })} />
          <span className="seg-actions">
            <button type="button" className="icon" onClick={() => move(i, -1)} title="Move up">↑</button>
            <button type="button" className="icon" onClick={() => move(i, 1)} title="Move down">↓</button>
            <button type="button" className="icon danger" onClick={() => remove(i)} title="Remove">✕</button>
          </span>
        </div>
      ))}
      <div className="row between">
        <button type="button" className="btn ghost btn-sm" onClick={add}>+ Add segment</button>
        <span className="muted">Total {fmt(totalOf(segments))}</span>
      </div>
    </div>
  );
}
