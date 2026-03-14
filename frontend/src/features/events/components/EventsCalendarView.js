import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';

/**
 * Month calendar view for events. Shows events on their start date.
 * Supports split panel: calendar on left or right, with selected event details.
 */
const EventsCalendarView = ({ events, selectedEventId, onSelectEvent, panelPosition = 'right', registeredEvents }) => {
  const [viewDate, setViewDate] = React.useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const numDays = last.getDate();
    const result = [];
    for (let i = 0; i < startDay; i++) result.push(null);
    for (let d = 1; d <= numDays; d++) result.push(d);
    return result;
  }, [viewDate]);

  const eventsByDate = useMemo(() => {
    const map = {};
    (events || []).forEach((ev) => {
      if (!ev.start_time) return;
      const d = new Date(ev.start_time);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const selectedEvent = selectedEventId && events ? events.find((e) => e.id === selectedEventId) : null;

  const CalendarGrid = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
        <button type="button" onClick={prevMonth} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-gray-900">{monthLabel}</span>
        <button type="button" onClick={nextMonth} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 py-2 border-b border-gray-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-100">
        {days.map((d, i) => {
          if (d === null) return <div key={`pad-${i}`} className="bg-gray-50 min-h-[80px]" />;
          const key = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayEvents = eventsByDate[key] || [];
          const isSelected = dayEvents.some((e) => e.id === selectedEventId);
          return (
            <div
              key={key}
              className={`bg-white min-h-[80px] p-1 ${isSelected ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}
            >
              <span className="text-sm font-medium text-gray-700">{d}</span>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 2).map((ev) => {
                  const isReg = registeredEvents && registeredEvents.includes(ev.id);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelectEvent(ev.id)}
                      className={`block w-full text-left truncate text-xs px-1 py-0.5 rounded ${
                        selectedEventId === ev.id
                          ? 'bg-indigo-600 text-white'
                          : isReg
                          ? 'bg-green-100 text-green-800'
                          : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                      }`}
                    >
                      {ev.title}
                    </button>
                  );
                })}
                {dayEvents.length > 2 && (
                  <span className="text-xs text-gray-500">+{dayEvents.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const DetailPanel = () =>
    selectedEvent ? (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedEvent.title}</h3>
        <p className="text-gray-600 text-sm mb-4">{selectedEvent.description}</p>
        <div className="space-y-2 mb-4">
          {selectedEvent.start_time && (
            <p className="text-sm text-gray-600">
              <strong>Start:</strong>{' '}
              {new Date(selectedEvent.start_time).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          {selectedEvent.end_time && (
            <p className="text-sm text-gray-600">
              <strong>End:</strong>{' '}
              {new Date(selectedEvent.end_time).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          {selectedEvent.location && (
            <p className="text-sm text-gray-600">
              <strong>Location:</strong> {selectedEvent.location}
            </p>
          )}
          <p className="text-sm text-gray-600">
            <strong>Registrations:</strong> {selectedEvent.current_registrations || 0}
            {selectedEvent.max_registrations ? ` / ${selectedEvent.max_registrations}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/events/${selectedEvent.id}`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700"
          >
            View Details
          </Link>
          {registeredEvents && registeredEvents.includes(selectedEvent.id) && (
            <Link
              to="/my-events"
              className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600"
            >
              View Registration
            </Link>
          )}
        </div>
      </div>
    ) : (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-center min-h-[200px] text-gray-500">
        Click an event on the calendar to see details
      </div>
    );

  const isCalendarLeft = panelPosition === 'left';

  return (
    <div className={`grid gap-6 ${panelPosition === 'bottom' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
      {panelPosition === 'bottom' ? (
        <>
          <CalendarGrid />
          <DetailPanel />
        </>
      ) : (
        <>
          {isCalendarLeft && <CalendarGrid />}
          <DetailPanel />
          {!isCalendarLeft && <CalendarGrid />}
        </>
      )}
    </div>
  );
};

export default EventsCalendarView;
