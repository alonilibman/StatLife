import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

const PILLARS = {
  "Vitality (Body)": ["Strength", "Endurance", "Flexibility", "Sleep Quality", "Nutrition", "Bio-hacking", "Recovery"],
  "Cognitive (Mind)": ["Deep Focus", "Memory", "Critical Thinking", "Logic", "Learning Speed", "Pattern Recognition", "Curiosity"],
  "Intimate (Relational)": ["Partner Happiness", "Romantic Stewardship", "Sexual Connection", "Conflict Resolution", "Shared Vision", "Loyalty", "Appreciation"],
  "Economic (Wealth)": ["Saving Rate", "Investment Literacy", "Income Streams", "Debt Management", "Asset Protection", "Tax Optimization", "Wealth Mindset"],
  "Mastery (Work)": ["Technical Skill", "Leadership", "Public Speaking", "Negotiation", "Networking", "Deep Work", "Mentorship"],
  "Social (People)": ["Friendship Quality", "Family Bonds", "Empathy", "Social Calibration", "Community Impact", "Charisma", "Altruism"],
  "Psychological (Self)": ["Resilience", "Discipline", "Self-Awareness", "Self-Confidence", "Emotional Regulation", "Vulnerability", "Integrity"],
  "Philosophical (Soul)": ["Mindfulness", "Inner Peace", "Sense of Purpose", "Gratitude", "Moral Clarity", "Stoicism", "Ego Dissolution"],
  "Pragmatic (Skills)": ["Handyman Ability", "Digital Security", "Self-Defense", "Navigation", "First Aid", "Survival Logic", "Culinary Mastery"],
  "Aesthetic (Style)": ["Personal Style", "Home Environment", "Creative Output", "Musicality", "Curation", "Writing Ability", "Minimalism"]
};

export default function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('statUser')));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('male');
  const [isSignUp, setIsSignUp] = useState(false);
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  async function fetchStats() {
    const { data } = await supabase.from('user_ratings').select('*').eq('username', user.username);
    const s = {};
    data?.forEach(r => s[r.category] = r.rating);
    setStats(s);
  }

  async function handleAuth(e) {
    e.preventDefault();
    if (isSignUp) {
      const { data: existing } = await supabase.from('users').select('*').eq('username', username).single();
      if (existing) return alert("Username taken!");
      const { error } = await supabase.from('users').insert([{ username, password, gender }]);
      if (error) return alert(error.message);
      loginUser({ username, gender, is_admin: false });
    } else {
      const { data, error } = await supabase.from('users').select('*').eq('username', username).eq('password', password).single();
      if (error || !data) return alert("Invalid credentials.");
      loginUser(data);
    }
  }

  function loginUser(userData) {
    localStorage.setItem('statUser', JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('statUser');
    window.location.reload();
  }

  async function updateStat(cat, val) {
    setStats(prev => ({ ...prev, [cat]: val }));
    await supabase.from('user_ratings').upsert(
      { username: user.username, category: cat, rating: val },
      { onConflict: 'username,category' }
    );
  }

  if (!user) return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>STATLIFE</h1>
        <form onSubmit={handleAuth}>
          <input placeholder="USERNAME" required onChange={e => setUsername(e.target.value)} />
          <input type="password" placeholder="PASSWORD" required onChange={e => setPassword(e.target.value)} />
          {isSignUp && (
            <select onChange={e => setGender(e.target.value)}>
              <option value="male">MALE</option>
              <option value="female">FEMALE</option>
            </select>
          )}
          <button type="submit">{isSignUp ? 'REGISTER' : 'LOGIN'}</button>
        </form>
        <p className="toggle-btn" onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'EXISTING USER? LOGIN' : 'NEW HUMAN? REGISTER'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="header">
        <h1>STATLIFE</h1>
        <div>
          <span className="user-badge">{user.username.toUpperCase()}</span>
          <button className="logout-btn" onClick={logout}>LOGOUT</button>
        </div>
      </div>

      {user.is_admin ? <AdminStats /> : (
        <div className="pillar-grid">
          {Object.entries(PILLARS).map(([pillar, categories]) => (
            <div key={pillar} className="pillar-section">
              <div className="pillar-title">{pillar}</div>
              {categories.map(cat => (
                <div key={cat} className="stat-card">
                  <div className="flex-bet">
                    <span>{cat}</span>
                    <span className="val-text">{stats[cat] || 0}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={stats[cat] || 0} onChange={e => updateStat(cat, parseInt(e.target.value))} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminStats() {
  const [avg, setAvg] = useState({});
  useEffect(() => {
    supabase.from('user_ratings').select('category, rating').then(({ data }) => {
      const g = data.reduce((acc, c) => {
        if (!acc[c.category]) acc[c.category] = { s: 0, n: 0 };
        acc[c.category].s += c.rating;
        acc[c.category].n += 1;
        return acc;
      }, {});
      setAvg(g);
    });
  }, []);

  return (
    <div className="admin-grid">
      {Object.keys(avg).map(c => (
        <div key={c} className="card-mini">
          <div className="mini-label">{c}</div>
          <div className="admin-val">{(avg[c].s / avg[c].n).toFixed(1)}%</div>
        </div>
      ))}
    </div>
  );
}