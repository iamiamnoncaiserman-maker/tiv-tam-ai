"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function Page() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ role: 'ai', content: 'Ready! What are we buying today?' }]);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchList = async () => {
    const { data } = await supabase.from('shopping_list').select('*').eq('status', 'pending');
    if (data) setList(data);
  };

  useEffect(() => { fetchList(); }, []);

  const handleSend = async () => {
    if (!input || loading) return;
    const msg = input;
    setInput('');
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    try {
      const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: msg }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
      fetchList();
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: "Error." }]);
    } finally {
      setLoading(false);
    }
  };

  const startSync = async () => {
    alert("Syncing started! The robot is now heading to Tiv Taam. Check your basket in 2 minutes.");
    // We will connect this to GitHub Actions in the next step
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', backgroundColor: '#f8fafc', color: '#000' }}>
      {/* HEADER */}
      <header style={{ padding: '16px', background: '#2563eb', color: 'white', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <span>TIV TAAM AI</span>
        <span style={{ background: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{list.length} Items</span>
      </header>
      
      {/* CHAT & LIST AREA */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '120px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ padding: '12px', marginBottom: '12px', borderRadius: '12px', fontSize: '14px', maxWidth: '85%', background: m.role === 'user' ? '#dbeafe' : 'white', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', border: '1px solid #e2e8f0', marginLeft: m.role === 'user' ? 'auto' : '0' }}>
            {m.content}
          </div>
        ))}
        
        <div style={{ marginTop: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Your Shopping List</p>
          {list.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'white', borderRadius: '8px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontWeight: '500' }}>{item.hebrew_search_term} <span style={{ color: '#94a3b8', fontSize: '12px' }}>({item.quantity})</span></span>
              <button onClick={async () => { await supabase.from('shopping_list').delete().eq('id', item.id); fetchList(); }} style={{ color: '#ef4444', border: 'none', background: 'none', padding: '4px' }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* FIXED FOOTER */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            style={{ flex: 1, padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '16px', outline: 'none' }} 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Add groceries..." 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} style={{ padding: '12px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Add</button>
        </div>
        <button onClick={startSync} style={{ width: '100%', padding: '14px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px' }}>
          🛒 SYNC TO TIV TAAM BASKET
        </button>
      </div>
    </div>
  );
}
