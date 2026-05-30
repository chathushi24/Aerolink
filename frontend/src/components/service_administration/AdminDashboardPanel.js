import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function AdminDashboardPanel() {
  const { 
    campaigns, setCampaigns, 
    airlines, setAirlines, 
    sectors, setSectors, 
    consoleLogs 
  } = useContext(AuthContext);

  // States for new Sector creation
  const [newSectorCode, setNewSectorCode] = useState('');
  const [newSectorCity, setNewSectorCity] = useState('');
  const [newSectorCountry, setNewSectorCountry] = useState('');

  // States for new Discount Campaign creation
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDiscount, setNewCampaignDiscount] = useState(15);
  const [newCampaignTarget, setNewCampaignTarget] = useState('LHR');
  
  const [successMsg, setSuccessMsg] = useState('');

  // Handler to add a new Sector
  const handleAddSector = (e) => {
    e.preventDefault();
    if (!newSectorCode || !newSectorCity || !newSectorCountry) return;
    const newSec = {
      code: newSectorCode.toUpperCase().trim(),
      city: newSectorCity.trim(),
      country: newSectorCountry.trim()
    };
    if (sectors.find(s => s.code === newSec.code)) {
      alert("Sector code already exists!");
      return;
    }
    const updated = [...sectors, newSec];
    setSectors(updated);
    setNewSectorCode('');
    setNewSectorCity('');
    setNewSectorCountry('');
    showSuccess("Sector registered successfully!");
  };

  // Handler to add a new Discount Campaign
  const handleAddCampaign = (e) => {
    e.preventDefault();
    if (!newCampaignName || !newCampaignTarget) return;
    const newCamp = {
      id: 'c_' + Date.now(),
      name: newCampaignName.trim(),
      discount: parseInt(newCampaignDiscount),
      target: newCampaignTarget.toUpperCase().trim(),
      status: 'ACTIVE'
    };
    const updated = [...campaigns, newCamp];
    setCampaigns(updated);
    setNewCampaignName('');
    setNewCampaignDiscount(15);
    setNewCampaignTarget('LHR');
    showSuccess("Seasonal discount campaign created!");
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Toggle partner airline status
  const handleToggleAirlineStatus = (airlineCode, nextStatus) => {
    const updated = airlines.map(al => {
      if (al.code === airlineCode) {
        return { ...al, status: nextStatus };
      }
      return al;
    });
    setAirlines(updated);
  };

  // Delete Campaign
  const handleDeleteCampaign = (id) => {
    setCampaigns(campaigns.filter(c => c.id !== id));
    showSuccess("Campaign deleted.");
  };

  // Toggle Campaign status
  const handleToggleCampaignStatus = (id) => {
    const updated = campaigns.map(c => {
      if (c.id === id) {
        return { ...c, status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' };
      }
      return c;
    });
    setCampaigns(updated);
  };

  return (
    <div className="admin-dashboard-container">
      {/* Welcome & Dashboard header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2rem' }}>AeroLink Control Tower</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Global system operations, fleet statuses, active discount channels, and SQS network integrations</p>
        </div>
        {successMsg && <div className="alert success" style={{ marginBottom: 0, padding: '0.5rem 1rem' }}>{successMsg}</div>}
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-title">Total Revenue</span>
          <span className="kpi-value">$7,480.00</span>
          <span className="kpi-trend positive">↑ 12.4% vs last week</span>
          <div className="sparkline-container">
            <div className="sparkbar" style={{ height: '35%' }}></div>
            <div className="sparkbar" style={{ height: '45%' }}></div>
            <div className="sparkbar" style={{ height: '60%' }}></div>
            <div className="sparkbar" style={{ height: '50%' }}></div>
            <div className="sparkbar" style={{ height: '75%' }}></div>
            <div className="sparkbar active" style={{ height: '90%' }}></div>
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Operational Bookings</span>
          <span className="kpi-value">14 Tickets</span>
          <span className="kpi-trend positive">✓ 98.4% SQS delivery success</span>
          <div className="sparkline-container">
            <div className="sparkbar" style={{ height: '40%' }}></div>
            <div className="sparkbar" style={{ height: '55%' }}></div>
            <div className="sparkbar" style={{ height: '45%' }}></div>
            <div className="sparkbar" style={{ height: '70%' }}></div>
            <div className="sparkbar active" style={{ height: '85%' }}></div>
            <div className="sparkbar active" style={{ height: '95%' }}></div>
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">Sector Utilization</span>
          <span className="kpi-value">84.2%</span>
          <span className="kpi-trend neutral">→ Average occupancy stable</span>
          <div className="sparkline-container">
            <div className="sparkbar" style={{ height: '70%' }}></div>
            <div className="sparkbar" style={{ height: '75%' }}></div>
            <div className="sparkbar" style={{ height: '80%' }}></div>
            <div className="sparkbar" style={{ height: '82%' }}></div>
            <div className="sparkbar active" style={{ height: '85%' }}></div>
            <div className="sparkbar active" style={{ height: '84%' }}></div>
          </div>
        </div>

        <div className="kpi-card">
          <span className="kpi-title">AWS Service Health</span>
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span>EKS Pods</span>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span>SQS Queues</span>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span>EventBridge</span>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span>DynamoDB</span>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left column (Fleet & Sectors), Right column (Campaigns & Live terminal) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Partner Fleet Management */}
          <div className="glass-panel">
            <h3>Partner Fleet Management</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>Track aircraft carriers, fleet inventory, and current operational states</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Airline Code</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Carrier Name</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Fleets</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Prune/Change</th>
                  </tr>
                </thead>
                <tbody>
                  {airlines.map(al => (
                    <tr key={al.code} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace' }}>{al.code}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>{al.name}</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{al.fleetSize} planes</td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span className={`airline-pill ${al.status.toLowerCase()}`}>{al.status}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <select 
                          className="glass-input" 
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', width: 'auto' }}
                          value={al.status}
                          onChange={(e) => handleToggleAirlineStatus(al.code, e.target.value)}
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="MAINTENANCE">MAINTENANCE</option>
                          <option value="GROUNDED">GROUNDED</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Global Sector Register */}
          <div className="glass-panel">
            <h3>Global Sector Register</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>Map active airports and destinations supported by AeroLink</p>
            
            <form onSubmit={handleAddSector} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 90px', gap: '0.5rem', alignItems: 'end', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.7rem' }}>IATA</label>
                <input className="glass-input" style={{ padding: '0.5rem' }} type="text" placeholder="DXB" value={newSectorCode} onChange={e => setNewSectorCode(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.7rem' }}>City</label>
                <input className="glass-input" style={{ padding: '0.5rem' }} type="text" placeholder="Dubai" value={newSectorCity} onChange={e => setNewSectorCity(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.7rem' }}>Country</label>
                <input className="glass-input" style={{ padding: '0.5rem' }} type="text" placeholder="U.A.E." value={newSectorCountry} onChange={e => setNewSectorCountry(e.target.value)} required />
              </div>
              <button className="glass-button" style={{ padding: '0.6rem 0.8rem', fontSize: '0.8rem' }} type="submit">Add</button>
            </form>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {sectors.map(sec => (
                <div key={sec.code} className="hub-pill" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.6rem' }}>
                  <strong style={{ color: 'var(--accent-primary)' }}>{sec.code}</strong>
                  <span>{sec.city}, {sec.country}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Discount Campaign Manager */}
          <div className="glass-panel">
            <h3>Seasonal Discount Campaigns</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>Setup discount tariffs mapped to target flight sectors (reflected instantly in searches!)</p>

            <form onSubmit={handleAddCampaign} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end', marginBottom: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.7rem' }}>Campaign Name</label>
                <input className="glass-input" style={{ padding: '0.5rem' }} type="text" placeholder="Cherry Blossom Fest" value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.7rem' }}>Discount %</label>
                <input className="glass-input" style={{ padding: '0.5rem' }} type="number" min={5} max={80} value={newCampaignDiscount} onChange={e => setNewCampaignDiscount(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.7rem' }}>Target IATA</label>
                <select className="glass-input" style={{ padding: '0.45rem' }} value={newCampaignTarget} onChange={e => setNewCampaignTarget(e.target.value)}>
                  {sectors.map(s => (
                    <option key={s.code} value={s.code}>{s.code}</option>
                  ))}
                </select>
              </div>
              <button className="glass-button" style={{ padding: '0.6rem 0.8rem', fontSize: '0.8rem' }} type="submit">Create</button>
            </form>

            <div className="campaign-grid">
              {campaigns.map(camp => (
                <div key={camp.id} className={`campaign-card ${camp.status === 'ACTIVE' ? 'active-campaign' : ''}`}>
                  <span className="campaign-badge">{camp.discount}% Off</span>
                  <h4>{camp.name}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0' }}>Sector Destination: <strong style={{ color: 'var(--accent-secondary)' }}>{camp.target}</strong></p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status: {camp.status}</p>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button 
                      className="glass-button secondary" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => handleToggleCampaignStatus(camp.id)}
                    >
                      {camp.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                    <button 
                      className="glass-button secondary" 
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', color: 'var(--error)' }}
                      onClick={() => handleDeleteCampaign(camp.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Event Integrations Console Terminal */}
          <div className="terminal-panel">
            <div className="terminal-header">
              <div className="terminal-dots">
                <span className="term-dot red"></span>
                <span className="term-dot yellow"></span>
                <span className="term-dot green"></span>
              </div>
              <span className="terminal-title">INTEGRATIONS CONTROLLER STREAM</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontFamily: 'monospace' }}>● ONLINE</span>
            </div>
            
            <div className="terminal-console">
              {consoleLogs.map((log, index) => (
                <div key={index} className="terminal-log-line">
                  <span className="timestamp">[{log.time}]</span>
                  <span className={`tag ${log.tag}`}>{log.tag}</span>
                  <span className="message">{log.msg}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
