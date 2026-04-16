import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

const SUBJECTS = ['Physical', 'Mental', 'Social', 'Financial', 'Intellectual'];

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
      // Register
      const { data: existing } = await supabase.from('users').select('*').eq('username', username).single();
      if (existing) return alert("Username taken!");
      
      const { error } = await supabase.from('users').insert([{ username, password, gender }]);
      if (error) return alert(error.message);
      
      loginUser({ username, gender, is_admin: false });
    } else {
      // Login
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

  if (!user) return (
    <div className="container">
      <div className="card">
        <h1 style={{ textAlign: 'center', letterSpacing: '-2px' }}>STATLIFE</h1>
        <form onSubmit={handleAuth}>
          <input placeholder="USERNAME" required onChange={e => setUsername(e.target.value)} />
          <input type="password" placeholder="PASSWORD" required onChange={e => setPassword(e.target.value)} />
          {isSignUp && (
            <select onChange={e => setGender(e.target.value)}>
              <option value="male">MALE</option>
              <option value="female">FEMALE</option>
            </select>
          )}
          <button type="submit">{isSignUp ? 'CREATE ACCOUNT' : 'LOGIN'}</button>
        </form>
        <p style={{ textAlign: 'center', fontSize: '11px', cursor: 'pointer', marginTop: '20px', fontWeight:'bold' }} onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'GO TO LOGIN' : 'REGISTER NEW USER'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
        <h2 style={{ margin: 0 }}>{user.is_admin ? 'GLOBAL' : user.username.toUpperCase()}</h2>
        <button onClick={logout} style={{ width: 'auto', background: 'none', color: 'red', padding: 0 }}>LOGOUT</button>
      </div>

      {user.is_admin ? <AdminStats /> : (
        SUBJECTS.map(cat => (
          <div key={cat} className="stat-row">
            <div className="flex-bet">
              <span>{cat.toUpperCase()}</span>
              <span>{stats[cat] || 0}%</span>
            </div>
            <input type="range" min="0" max="100" value={stats[cat] || 0} onChange={e => updateStat(cat, parseInt(e.target.value))} />
          </div>
        ))
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
    <div>
      {Object.keys(avg).map(c => (
        <div key={c} className="card">
          <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{c.toUpperCase()} AVG</div>
          <div className="admin-val">{(avg[c].s / avg[c].n).toFixed(1)}%</div>
        </div>
      ))}
    </div>
  );
}