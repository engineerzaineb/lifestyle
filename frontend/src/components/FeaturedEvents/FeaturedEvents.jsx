import events from '../../data/events';
import EventCard from '../EventCard/EventCard';

export default function FeaturedEvents() {
  return (
    <section
      style={{
        padding: '80px 40px',
      }}
    >
      <h2>Featured Events</h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
          marginTop: 30,
        }}
      >{events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
          />
        ))}
      </div>
    </section>
  );
}