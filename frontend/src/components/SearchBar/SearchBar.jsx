import { Search } from 'lucide-react';

export default function SearchBar({ value, onChange }) {
  return (
    <div
      style={{
        maxWidth: 500,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'white',
        padding: 15,
        borderRadius: 12,
      }}
    >
      <Search size={20} />
<input
        type="text"
        placeholder="Search events"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: 'none',
          flex: 1,
          fontSize: 16,
        }}
      />
    </div>
  );
}