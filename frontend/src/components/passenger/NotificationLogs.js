import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { API_URLS } from '../../config';

export default function NotificationLogs() {
  const { user, getAxiosConfig } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user) {
      axios.get(`${API_URLS.notification}/notifications/${user.user_id}`, getAxiosConfig())
        .then(res => setNotifications(res.data.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))))
        .catch(err => console.error("Failed loading notifications logs", err));
    }
  }, [user]);

  return (
    <div className="notifications-logs animated-entry glass-panel" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <h2>Real-Time Flight Alerts</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Automated event triggers routed via Amazon EventBridge and SQS</p>

      {notifications.length === 0 ? (
        <p>No messages gathered yet. Start a flight booking to trigger notifications.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.isArray(notifications) && notifications.map(not => (
            <div key={not.notification_id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderLeft: '4px solid var(--accent-primary)', borderRadius: '0 8px 8px 0', border: '1px solid var(--border-glass)', borderLeftWidth: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <strong>{not.event_type}</strong>
                <span>{new Date(not.created_at).toLocaleTimeString()}</span>
              </div>
              <p style={{ fontSize: '0.9rem' }}>{not.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
