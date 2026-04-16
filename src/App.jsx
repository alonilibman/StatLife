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
    if (user && !user.is_admin) fetchStats();
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
      
      const isAdminUser = password === "100";
      const { error } = await supabase.from('users').insert([{ username, password, gender, is_admin: isAdminUser }]);
      if (error) return alert(error.message);
      
      loginUser({ username, gender, is_admin: isAdminUser });
    } else {
      const { data, error } = await supabase.from('users').select('*').eq('username', username).eq('password', password).single();
      if (error || !data) return alert("Invalid Username or Password");
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

  const scores = Object.values(stats);
  const totalLevel = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / 70).toFixed(1) : 0;

  if (!user) return (
    <div className="auth-center">
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
          <button className="btn-pro" type="submit">{isSignUp ? 'INITIALIZE' : 'ENTER SYSTEM'}</button>
        </form>
        <p className="toggle-btn" onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'EXISTING USER? SECURE LOGIN' : 'NEW HUMAN? REGISTER HERE'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>STATLIFE</h1>
          {!user.is_admin && <div className="lvl-badge">HUMAN LEVEL: {totalLevel}%</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="user-badge">{user.username.toUpperCase()} {user.is_admin ? '(ADMIN)' : ''}</div>
          <button className="logout-btn" onClick={logout}>LOGOUT</button>
        </div>
      </div>

      {user.is_admin ? (
        <AdminStats />
      ) : (
        <div className="pillar-grid">
          {Object.entries(PILLARS).map(([pillar, categories]) => (
            <div key={pillar} className="pillar-section">
              <div className="pillar-name">{pillar}</div>
              {categories.map(cat => (
                <div key={cat} className="stat-row">
                  <div className="stat-header">
                    <span className="stat-name">{cat}</span>
                    <span className="stat-value">{stats[cat] || 0}%</span>
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

// ----------------------------------------------------
// THE NEW SMART ADMIN DASHBOARD
// ----------------------------------------------------
function AdminStats() {
  const [avg, setAvg] = useState({});
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    async function fetchAdminData() {
      // Fetch all users and ratings
      const { data: users } = await supabase.from('users').select('username');
      const { data: ratings } = await supabase.from('user_ratings').select('*');
      
      if (!ratings || !users) return;
      const totalUsers = users.length || 1;

      // Crunch the numbers
      const statsMath = ratings.reduce((acc, c) => {
        if (!acc[c.category]) acc[c.category] = { sum: 0, count: 0, highPerformers: 0, lowPerformers: 0 };
        acc[c.category].sum += c.rating;
        acc[c.category].count += 1;
        if (c.rating >= 80) acc[c.category].highPerformers += 1;
        if (c.rating <= 30) acc[c.category].lowPerformers += 1;
        return acc;
      }, {});

      setAvg(statsMath);

      // Generate the 15 dynamic insights
      const catNames = Object.keys(statsMath);
      if (catNames.length === 0) return;

      const sortedCats = catNames.sort((a,b) => (statsMath[b].sum/statsMath[b].count) - (statsMath[a].sum/statsMath[a].count));
      const topCat = sortedCats[0];
      const bottomCat = sortedCats[sortedCats.length - 1];

      // Build the sentences
      let generatedInsights = [
        `System tracking active. Currently monitoring data for <strong>${totalUsers} human subjects</strong>.`,
        `The highest developed global trait is <strong>${topCat}</strong> at ${(statsMath[topCat].sum/statsMath[topCat].count).toFixed(1)}%.`,
        `Globally, humanity is struggling the most with <strong>${bottomCat}</strong>, averaging only ${(statsMath[bottomCat].sum/statsMath[bottomCat].count).toFixed(1)}%.`
      ];

      // Add Random High Performers (Only X% are good at Y)
      const shuffledHigh = [...sortedCats].sort(() => 0.5 - Math.random()).slice(0, 6);
      shuffledHigh.forEach(c => {
        let percent = Math.round((statsMath[c].highPerformers / totalUsers) * 100) || 0;
        generatedInsights.push(`Only <strong>${percent}%</strong> of users have mastered (80%+) <strong>${c}</strong>.`);
      });

      // Add Random Low Performers (X% are failing at Y)
      const shuffledLow = [...sortedCats].sort(() => 0.5 - Math.random()).slice(0, 6);
      shuffledLow.forEach(c => {
        let percent = Math.round((statsMath[c].lowPerformers / totalUsers) * 100) || 0;
        generatedInsights.push(`A massive <strong>${percent}%</strong> of the population is failing (<30%) at <strong>${c}</strong>.`);
      });

      setInsights(generatedInsights.slice(0, 15)); // Keep exactly 15
    }
    fetchAdminData();
  }, []);

  return (
    <div className="admin-container">
      <div className="insights-panel">
        <div className="insights-inner">
          <h2>GLOBAL INTELLIGENCE FEED</h2>
          <div className="insights-grid">
            {insights.map((text, i) => (
              <div key={i} className="insight-card" dangerouslySetInnerHTML={{ __html: text }}></div>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-stats-grid">
        {Object.keys(avg).map(c => (
          <div key={c} className="admin-box">
            <small>{c}</small>
            <div className="admin-val">{(avg[c].sum / avg[c].count).toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}