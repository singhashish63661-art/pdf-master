import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const API_URL = "https://pdf-master-7yw7.onrender.com";

function LoadingOverlay({ message }) {
  return (
    <div className="loading-overlay">
      <div className="spinner"></div>
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', letterSpacing: '0.5px' }}>{message || "Processing..."}</h2>
    </div>
  );
}

// --- MINIMALIST AUTH PAGE ---
function Login({ setUserEmail }) {
  const [authMode, setAuthMode] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (authMode === 'login') {
        const res = await axios.post(`${API_URL}/login`, { email, password });
        setUserEmail(res.data.email); navigate('/'); 
      } else if (authMode === 'signup') {
        await axios.post(`${API_URL}/signup`, { email, password });
        alert("Account created! Please log in."); setAuthMode('login'); setPassword(''); 
      } else if (authMode === 'reset') {
        await axios.post(`${API_URL}/api/reset-password`, { email, new_password: password });
        alert("Password reset! Log in with your new password."); setAuthMode('login'); setPassword('');
      }
    } catch (err) { alert(`Error: ${err.response?.data?.detail || "Connection failed."}`); } 
    finally { setLoading(false); }
  };

  return (
    <div className="auth-layout-min">
      <div className="auth-box-min">
        <div style={{ width: '60px', height: '60px', background: 'var(--text-main)', color: 'var(--bg-main)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 20px auto', transform: 'rotate(-10deg)', boxShadow: 'var(--shadow-soft)' }}>📄</div>
        <h2>{authMode === 'reset' ? 'Reset Password' : authMode === 'signup' ? 'Create Account' : 'Welcome Back'}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '14px' }}>The intelligent document workspace.</p>
        
        <form onSubmit={handleSubmit}>
          <label className="auth-label">Work Email</label>
          <input className="input-field" type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
          
          <label className="auth-label">{authMode === 'reset' ? 'New Password' : 'Password'}</label>
          <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          
          {authMode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '20px' }}>
              <span className="auth-link" style={{fontSize: '12px'}} onClick={() => setAuthMode('reset')}>Forgot password?</span>
            </div>
          )}

          <button className="upload-btn" type="submit" disabled={loading} style={{ marginTop: authMode === 'login' ? '0' : '10px' }}>
            {loading ? "Please wait..." : authMode === 'login' ? "Sign In" : authMode === 'signup' ? "Create Account" : "Reset Password"}
          </button>
        </form>

        <div style={{ marginTop: '30px', fontSize: '13px', color: 'var(--text-muted)' }}>
          {authMode === 'login' ? "Don't have an account? " : "Back to "}
          <span className="auth-link" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setPassword(''); }}>
            {authMode === 'login' ? "Sign up" : "Log in"}
          </span>
        </div>
      </div>
    </div>
  );
}

// --- WORKSPACE DASHBOARD ---
function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      title: "Workflows & Automation",
      tools: [
        { name: "Automated Workflow", desc: "Run multiple tools at once.", icon: "⚙️", path: "/workflow" },
        { name: "Compare PDFs", desc: "Find exact text differences.", icon: "⚖️", path: "/compare" },
        { name: "Merge PDF", desc: "Combine multiple PDFs.", icon: "🗂️", path: "/merge" },
        { name: "Split PDF", desc: "Extract or separate pages.", icon: "✂️", path: "/split" },
      ]
    },
    {
      title: "AI & Intelligence",
      tools: [
        { name: "Chat with PDF", desc: "Ask the AI questions.", icon: "💬", path: "/chat" },
        { name: "Resume ATS Scanner", desc: "AI scoring for resumes.", icon: "📄", path: "/ats-scan" },
        { name: "Translate PDF", desc: "AI Document Translation.", icon: "🌍", path: "/translate" },
        { name: "PDF to Audio", desc: "Turn PDF into an MP3 Podcast.", icon: "🎧", path: "/pdf2audio" },
      ]
    },
    {
      title: "Document Engineering",
      tools: [
        { name: "Compress PDF", desc: "Reduce file size heavily.", icon: "🗜️", path: "/compress" },
        { name: "Repair PDF", desc: "Fix corrupted PDF files.", icon: "🔧", path: "/repair" },
        { name: "Metadata Hacker", desc: "Wipe hidden tracking data.", icon: "🕵️‍♂️", path: "/metadata" },
        { name: "Add Page Numbers", desc: "Stamp numbers on pages.", icon: "🔢", path: "/add-page-numbers" },
      ]
    },
    {
      title: "Conversion",
      tools: [
        { name: "JPG to PDF", desc: "Images to Document.", icon: "🖼️", path: "/img2pdf" },
        { name: "PDF to JPG", desc: "Extract images from PDF.", icon: "📸", path: "/pdf2jpg" },
        { name: "PDF to WORD", desc: "Convert to editable Word.", icon: "📝", path: "/pdf2word" },
        { name: "Extract Text", desc: "Rip raw text from PDF.", icon: "📋", path: "/extract" },
      ]
    },
    {
      title: "Security & Editing",
      tools: [
        { name: "Protect PDF", desc: "Add a password lock.", icon: "🔒", path: "/protect" },
        { name: "Unlock PDF", desc: "Remove a password.", icon: "🔓", path: "/unlock" },
        { name: "Redact PDF", desc: "Blackout sensitive words.", icon: "⬛", path: "/redact" },
        { name: "Flatten PDF", desc: "Make text un-copyable.", icon: "🛡️", path: "/flatten" },
        { name: "Sign PDF", desc: "Stamp digital signature.", icon: "✍️", path: "/sign" },
        { name: "Add Watermark", desc: "Stamp an image or text.", icon: "💧", path: "/watermark" },
        { name: "Remove Watermark", desc: "Erase headers and text.", icon: "🧽", path: "/remove-watermark" },
        { name: "Add QR Code", desc: "Embed a link as a QR.", icon: "📱", path: "/add-qrcode" },
        { name: "Rotate PDF", desc: "Spin pages 90 or 180 degrees.", icon: "🔄", path: "/rotate" },
        { name: "Crop PDF", desc: "Trim white margins.", icon: "📐", path: "/crop" },
      ]
    }
  ];

  return (
    <div className="dashboard-grid">
      <div className="page-header">
        <h1 className="gradient-text">Workspace.</h1>
        <p>Select a tool from the suite to begin processing your documents.</p>
        <div className="search-bar-wrap">
          <span className="search-icon">🔍</span>
          <input type="text" className="search-input" placeholder="Search for tools (e.g. 'Merge', 'AI', 'Security')..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>
      {categories.map((category, idx) => {
        const filtered = category.tools.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.desc.toLowerCase().includes(searchQuery.toLowerCase()));
        if (filtered.length === 0) return null;
        return (
          <div key={idx} className="category-section">
            <h3 className="category-title">{category.title}</h3>
            <div className="tools-grid">
              {filtered.map((tool, tIdx) => (
                <div key={tIdx} className="tool-card" onClick={() => navigate(tool.path)}>
                  <div className="tool-icon-wrap">{tool.icon}</div>
                  <div className="tool-info"><h3>{tool.name}</h3><p>{tool.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- NEW SLEEK ACCOUNT DASHBOARD 👤 ---
function AccountDashboard({ userEmail, setUserEmail }) {
  const [history, setHistory] = useState([]);
  useEffect(() => { axios.get(`${API_URL}/api/history/${userEmail}`).then(res => setHistory(res.data)); }, [userEmail]);
  
  return (
    <div className="tool-workspace" style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <h1>Account Settings</h1>
        <p>Manage your profile and view your recent activity.</p>
      </div>

      <div className="profile-card">
        <div className="avatar-huge">{userEmail ? userEmail[0].toUpperCase() : "U"}</div>
        <h2 className="profile-email">{userEmail}</h2>
        <div className="profile-badge">PRO MEMBER</div>
        <div style={{ marginTop: '20px' }}>
          <button className="upload-btn" style={{ width: 'auto', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '10px 24px', boxShadow: 'none' }} onClick={() => { setUserEmail(null); window.location.href='/login'; }}>Sign Out</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-box"><p>Total Documents Processed</p><h2>{history.length}</h2></div>
        <div className="stat-box"><p>Account Status</p><h2 style={{ color: '#10b981' }}>Active</h2></div>
      </div>

      <div className="history-container">
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Recent Activity Log</h3>
        {history.length === 0 ? (<p style={{ color: 'var(--text-muted)' }}>No activity yet.</p>) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="history-table">
              <thead><tr><th>Action</th><th>File Name</th><th>Timestamp</th></tr></thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr key={idx}>
                    <td><span className="action-pill">{item.action}</span></td>
                    <td>{item.filename}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(item.time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { axios.get(`${API_URL}/api/admin/stats`).then(res => setStats(res.data)); }, []);
  if (!stats) return <div style={{textAlign: 'center', marginTop: '100px'}}>Loading God Mode...</div>;

  return (
    <div className="tool-workspace" style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <h1 className="gradient-text" style={{ fontSize: '42px !important'}}>Admin HQ</h1>
        <p>Global platform statistics and live feed.</p>
      </div>
      <div className="stats-grid">
        <div className="stat-box"><p>Total Registered Users</p><h2>{stats.total_users}</h2></div>
        <div className="stat-box"><p>Total Files Processed</p><h2>{stats.total_files}</h2></div>
      </div>
      <div className="history-container">
        <h3 style={{ margin: '0 0 20px 0' }}>Live Global Feed</h3>
        <table className="history-table">
          <thead><tr><th>User</th><th>Action</th><th>Time</th></tr></thead>
          <tbody>{stats.activity.map((item, idx) => (<tr key={idx}><td>{item.email}</td><td><span className="action-pill">{item.action}</span></td><td style={{ color: 'var(--text-muted)' }}>{new Date(item.time).toLocaleString()}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

// --- SHARED UPLOAD COMPONENTS ---
function MassiveDropzone({ accept, isMultiple, onFilesSelected, files }) {
  const fileInputRef = useRef(null); const [isDragging, setIsDragging] = useState(false);
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) onFilesSelected(Array.from(e.dataTransfer.files)); };
  return (
    <div className="drop-zone" onClick={() => fileInputRef.current.click()} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }} onDrop={handleDrop} style={{ borderColor: isDragging ? 'var(--accent)' : 'var(--dropzone-border)' }}>
      <input type="file" multiple={isMultiple} accept={accept} ref={fileInputRef} onChange={(e) => onFilesSelected(Array.from(e.target.files))} className="file-input-hidden" />
      <div style={{ width: '60px', height: '60px', background: 'var(--glass-card)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '15px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-soft)' }}>📄</div>
      <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '5px' }}>Click to upload {isMultiple ? "files" : "a document"}</div>
      <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>{files.length > 0 ? <span style={{ color: '#10b981', fontWeight: 'bold' }}>✅ {files.length} file(s) selected</span> : "or drag and drop here"}</p>
    </div>
  );
}

function ToolTemplate({ title, desc, accept, isMultiple, endpoint, outputExt = ".pdf", userEmail, loadMessage }) {
  const [files, setFiles] = useState([]); const [isProcessing, setIsProcessing] = useState(false); const navigate = useNavigate();
  const handleProcess = async () => {
    if (files.length === 0) return; setIsProcessing(true); const formData = new FormData(); for (let i = 0; i < files.length; i++) formData.append(isMultiple ? 'files' : 'file', files[i]); formData.append('user_email', userEmail);
    try { const response = await axios.post(`${API_URL}/api/${endpoint}`, formData, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([response.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Result${outputExt}`); document.body.appendChild(link); link.click(); navigate('/'); } catch (error) { alert("Error"); } finally { setIsProcessing(false); } 
  };
  return (<div className="tool-workspace">{isProcessing && <LoadingOverlay message={loadMessage} />}<div className="breadcrumb" onClick={() => navigate('/')}>← Back to Workspace</div><div className="page-header"><h1>{title}</h1><p>{desc}</p></div><MassiveDropzone accept={accept} isMultiple={isMultiple} onFilesSelected={setFiles} files={files} />{files.length > 0 && <button className="upload-btn" onClick={handleProcess}>Process Document</button>}</div>);
}

function CustomInputTool({ title, desc, endpoint, inputName, inputPlaceholder, userEmail, isCheckbox }) {
  const [files, setFiles] = useState([]); const [inputValue, setInputValue] = useState(isCheckbox ? 'false' : ''); const [isProcessing, setIsProcessing] = useState(false); const navigate = useNavigate();
  const handleProcess = async () => {
    if (files.length === 0) return; setIsProcessing(true); const formData = new FormData(); formData.append('file', files[0]); formData.append(inputName, inputValue); formData.append('user_email', userEmail);
    try { const response = await axios.post(`${API_URL}/api/${endpoint}`, formData, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([response.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'Result.pdf'); document.body.appendChild(link); link.click(); navigate('/'); } catch (error) { alert("Error"); } finally { setIsProcessing(false); }
  };
  return (<div className="tool-workspace">{isProcessing && <LoadingOverlay />}<div className="breadcrumb" onClick={() => navigate('/')}>← Back to Workspace</div><div className="page-header"><h1>{title}</h1><p>{desc}</p></div><MassiveDropzone accept=".pdf" isMultiple={false} onFilesSelected={setFiles} files={files} />{files.length > 0 && (<>{isCheckbox ? <label style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px', background: 'var(--glass-card)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-soft)'}}><input type="checkbox" onChange={(e) => setInputValue(e.target.checked ? 'true' : 'false')} style={{transform:'scale(1.5)'}}/><span style={{fontWeight:'600'}}>Wipe all metadata clean</span></label> : <input className="input-field" type={inputName === 'password' ? 'password' : 'text'} placeholder={inputPlaceholder} onChange={(e) => setInputValue(e.target.value)} required /> }<button className="upload-btn" onClick={handleProcess}>Execute Tool</button></>)}</div>);
}

function WatermarkPDF({ userEmail }) {
  const [files, setFiles] = useState([]); const [text, setText] = useState('CONFIDENTIAL'); const [position, setPosition] = useState('center'); const [isProcessing, setIsProcessing] = useState(false); const navigate = useNavigate();
  const handleProcess = async () => {
    if (files.length === 0) return; setIsProcessing(true); const formData = new FormData(); formData.append('file', files[0]); formData.append('text', text); formData.append('position', position); formData.append('user_email', userEmail);
    try { const response = await axios.post(`${API_URL}/api/watermark`, formData, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([response.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'Watermarked.pdf'); document.body.appendChild(link); link.click(); navigate('/'); } catch(err) { alert("Error."); } finally { setIsProcessing(false); }
  };
  return (<div className="tool-workspace">{isProcessing && <LoadingOverlay />}<div className="breadcrumb" onClick={() => navigate('/')}>← Back to Workspace</div><div className="page-header"><h1>Add Watermark</h1><p>Stamp custom text anywhere on your PDF.</p></div><MassiveDropzone accept=".pdf" isMultiple={false} onFilesSelected={setFiles} files={files} />{files.length > 0 && (<><div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}><input className="input-field" style={{ margin: 0, flex: 2 }} type="text" value={text} onChange={(e) => setText(e.target.value)} required /><select className="input-field" style={{ margin: 0, flex: 1, cursor: 'pointer' }} value={position} onChange={(e) => setPosition(e.target.value)}><option value="center">Center</option><option value="bottom-right">Bottom Right</option></select></div><button className="upload-btn" onClick={handleProcess}>Stamp & Download</button></>)}</div>);
}

function TextExtractionTool({ title, desc, endpoint, isTranslate, userEmail }) {
  const [files, setFiles] = useState([]); const [lang, setLang] = useState('es'); const [text, setText] = useState(''); const [isProcessing, setIsProcessing] = useState(false);
  const handleProcess = async () => {
    if(files.length===0)return; setIsProcessing(true); const formData = new FormData(); formData.append('file', files[0]); formData.append('user_email', userEmail); if (isTranslate) formData.append('lang', lang);
    try { const response = await axios.post(`${API_URL}/api/${endpoint}`, formData); setText(response.data.text); } catch(err) { alert("Error"); } finally { setIsProcessing(false); }
  };
  return (<div className="tool-workspace">{isProcessing && <LoadingOverlay message="AI is reading document..." />}<div className="breadcrumb" onClick={() => window.location.href='/'}>← Back to Workspace</div><div className="page-header"><h1>{title}</h1><p>{desc}</p></div><MassiveDropzone accept=".pdf" isMultiple={false} onFilesSelected={setFiles} files={files} />{files.length > 0 && !text && isTranslate && (<select className="input-field" onChange={(e) => setLang(e.target.value)}><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option></select>)}<br/>{files.length > 0 && !text && <button className="upload-btn" onClick={handleProcess}>Run Analysis</button>}{text && (<div style={{ marginTop: '20px', background: 'var(--glass-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-soft)' }}><button className="btn-secondary" onClick={() => navigator.clipboard.writeText(text)}>Copy to Clipboard</button><textarea readOnly value={text} style={{ width: '100%', height: '300px', padding: '15px', background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-soft)', borderRadius: '12px' }} /></div>)}</div>);
}

function SignPDF({ userEmail }) {
  const [pdfFile, setPdfFile] = useState(null); const [imgFile, setImgFile] = useState(null); const [isProcessing, setIsProcessing] = useState(false); const navigate = useNavigate();
  const handleProcess = async () => {
    if (!pdfFile || !imgFile) return alert("Upload both files!"); setIsProcessing(true); const formData = new FormData(); formData.append('file', pdfFile); formData.append('signature', imgFile); formData.append('user_email', userEmail);
    try { const response = await axios.post(`${API_URL}/api/sign`, formData, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([response.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'Signed.pdf'); document.body.appendChild(link); link.click(); navigate('/'); } catch(err) { alert("Error"); } finally { setIsProcessing(false); }
  };
  return (<div className="tool-workspace">{isProcessing && <LoadingOverlay />}<div className="breadcrumb" onClick={() => navigate('/')}>← Back to Workspace</div><div className="page-header"><h1>Sign PDF</h1><p>Upload a PDF and a signature image.</p></div><div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}><div style={{flex: 1}}><div className="drop-zone" style={{ padding: '40px' }}><input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files[0])}/> <p style={{fontWeight:'600'}}>1. Upload PDF</p></div></div><div style={{flex: 1}}><div className="drop-zone" style={{ padding: '40px' }}><input type="file" accept="image/*" onChange={(e) => setImgFile(e.target.files[0])}/> <p style={{fontWeight:'600'}}>2. Upload Signature</p></div></div></div>{pdfFile && imgFile && <button className="upload-btn" onClick={handleProcess}>Stamp Signature</button>}</div>);
}

function AtsScanner({ userEmail }) {
  const [files, setFiles] = useState([]); const [result, setResult] = useState(null); const [isProcessing, setIsProcessing] = useState(false);
  const handleProcess = async () => {
    setIsProcessing(true); const formData = new FormData(); formData.append('file', files[0]); formData.append('user_email', userEmail);
    try { const response = await axios.post(`${API_URL}/api/ats-scan`, formData); setResult(response.data); } catch(err) { alert("Error"); } finally { setIsProcessing(false); }
  };
  return (<div className="tool-workspace">{isProcessing && <LoadingOverlay message="AI is grading resume..." />}<div className="breadcrumb" onClick={() => window.location.href='/'}>← Back</div><div className="page-header"><h1>ATS Resume Scan</h1><p>Test your resume against corporate AI filters.</p></div><MassiveDropzone accept=".pdf" isMultiple={false} onFilesSelected={setFiles} files={files} />{files.length > 0 && !result && <button className="upload-btn" onClick={handleProcess}>Analyze Resume</button>}{result && (<div style={{ background: 'var(--glass-card)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-soft)', textAlign: 'center', boxShadow: 'var(--shadow-soft)' }}><p style={{margin:0, color:'var(--text-muted)', fontWeight:'700', letterSpacing:'1px'}}>ATS MATCH SCORE</p><h2 style={{fontSize: '80px', margin: '10px 0', color: result.score > 70 ? '#10b981' : '#ef4444', fontWeight: '900'}}>{result.score}/100</h2><p style={{fontSize: '16px', fontWeight: '600'}}>Action Verbs Found: <span style={{color:'var(--accent)'}}>{result.verbs_found}</span></p><div style={{borderTop:'1px solid var(--border-soft)', margin:'20px 0'}}></div><p style={{color: 'var(--text-muted)', lineHeight:'1.6'}}>{result.feedback}</p></div>)}</div>);
}

function ComparePDF({ userEmail }) {
  const [files, setFiles] = useState([]); const [result, setResult] = useState(null); const [isProcessing, setIsProcessing] = useState(false);
  const handleProcess = async () => {
    if(files.length !== 2) return alert("Upload EXACTLY 2 PDFs!"); setIsProcessing(true); const formData = new FormData(); formData.append('files', files[0]); formData.append('files', files[1]); formData.append('user_email', userEmail);
    try { const response = await axios.post(`${API_URL}/api/compare`, formData); setResult(response.data); } catch(err) { alert("Error"); } finally { setIsProcessing(false); }
  };
  return (<div className="tool-workspace">{isProcessing && <LoadingOverlay message="Analyzing differences..." />}<div className="breadcrumb" onClick={() => window.location.href='/'}>← Back</div><div className="page-header"><h1>Compare PDFs</h1><p>Upload Version 1 and Version 2 to find text differences.</p></div><MassiveDropzone accept=".pdf" isMultiple={true} onFilesSelected={setFiles} files={files} />{files.length === 2 && !result && <button className="upload-btn" onClick={handleProcess}>Find Differences</button>}{result && (<div style={{ background: 'var(--glass-card)', padding: '30px', borderRadius: '20px', border: '1px solid var(--border-soft)', marginTop: '20px' }}><h3 style={{margin:'0 0 20px 0', fontSize:'20px'}}>{result.total_changes} Changes Found</h3><div style={{display: 'flex', gap: '20px'}}><div style={{flex: 1, background: 'rgba(239, 68, 68, 0.05)', padding: '20px', borderRadius: '12px', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)'}}><b style={{fontSize:'12px', textTransform:'uppercase', letterSpacing:'1px'}}>Deleted Text:</b><ul style={{paddingLeft: '20px', marginTop:'10px'}}>{result.removed.map((t, i) => <li key={i}>{t}</li>)}</ul></div><div style={{flex: 1, background: 'rgba(16, 185, 129, 0.05)', padding: '20px', borderRadius: '12px', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)'}}><b style={{fontSize:'12px', textTransform:'uppercase', letterSpacing:'1px'}}>Added Text:</b><ul style={{paddingLeft: '20px', marginTop:'10px'}}>{result.added.map((t, i) => <li key={i}>{t}</li>)}</ul></div></div></div>)}</div>);
}

function WorkflowBuilder({ userEmail }) {
  const [files, setFiles] = useState([]); const [isProcessing, setIsProcessing] = useState(false); const [actions, setActions] = useState({ compress: false, watermark: false, protect: false }); const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL'); const [password, setPassword] = useState('');
  const toggleAction = (key) => setActions({ ...actions, [key]: !actions[key] });
  const handleProcess = async () => {
    if (files.length === 0) return; const actionList = Object.keys(actions).filter(k => actions[k]); if (actionList.length === 0) return alert("Select an action!");
    setIsProcessing(true); const formData = new FormData(); formData.append('file', files[0]); formData.append('actions', JSON.stringify(actionList)); formData.append('watermark_text', watermarkText); formData.append('password', password); formData.append('user_email', userEmail);
    try { const response = await axios.post(`${API_URL}/api/workflow`, formData, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([response.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'Final_Workflow.pdf'); document.body.appendChild(link); link.click(); window.location.href = '/'; } catch (error) { alert("Workflow failed."); } finally { setIsProcessing(false); }
  };
  return (<div className="tool-workspace">{isProcessing && <LoadingOverlay message="Running Pipeline..." />}<div className="breadcrumb" onClick={() => window.location.href='/'}>← Back</div><div className="page-header"><h1>Automated Workflow</h1><p>Chain multiple tools together.</p></div><MassiveDropzone accept=".pdf" isMultiple={false} onFilesSelected={setFiles} files={files} />{files.length > 0 && (<div style={{ background: 'var(--glass-card)', padding: '30px', borderRadius: '20px', border: '1px solid var(--border-soft)' }}><h3 style={{ marginTop: 0, marginBottom: '20px' }}>Select Pipeline Actions:</h3><label style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', background: 'var(--bg-main)', borderRadius: '12px', marginBottom: '15px', cursor: 'pointer', border: '1px solid var(--border-soft)' }}><input type="checkbox" style={{ transform: 'scale(1.5)', accentColor: 'var(--accent)' }} checked={actions.compress} onChange={() => toggleAction('compress')} /><span style={{ fontWeight: '600' }}>🗜️ Heavy Compression</span></label><label style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', background: 'var(--bg-main)', borderRadius: '12px', marginBottom: '15px', cursor: 'pointer', border: '1px solid var(--border-soft)' }}><input type="checkbox" style={{ transform: 'scale(1.5)', accentColor: 'var(--accent)' }} checked={actions.watermark} onChange={() => toggleAction('watermark')} /><span style={{ fontWeight: '600', flex: 1 }}>💧 Add Watermark</span>{actions.watermark && <input type="text" className="input-field" style={{ margin: 0, width: '200px', padding: '10px' }} value={watermarkText} onChange={e => setWatermarkText(e.target.value)} />}</label><label style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', background: 'var(--bg-main)', borderRadius: '12px', marginBottom: '25px', cursor: 'pointer', border: '1px solid var(--border-soft)' }}><input type="checkbox" style={{ transform: 'scale(1.5)', accentColor: 'var(--accent)' }} checked={actions.protect} onChange={() => toggleAction('protect')} /><span style={{ fontWeight: '600', flex: 1 }}>🔒 Add Password</span>{actions.protect && <input type="password" className="input-field" style={{ margin: 0, width: '200px', padding: '10px' }} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />}</label><button className="upload-btn" onClick={handleProcess}>Run Pipeline 🚀</button></div>)}</div>);
}

function ChatWithPDF({ userEmail }) {
  const [files, setFiles] = useState([]); const [question, setQuestion] = useState(''); const [chatLog, setChatLog] = useState([]); const [isProcessing, setIsProcessing] = useState(false);
  const handleProcess = async (e) => {
    e.preventDefault(); if (files.length === 0 || !question) return; const newLog = [...chatLog, { role: 'user', text: question }]; setChatLog(newLog); setQuestion(''); setIsProcessing(true);
    const formData = new FormData(); formData.append('file', files[0]); formData.append('question', question); formData.append('user_email', userEmail);
    try { const response = await axios.post(`${API_URL}/api/chat`, formData); setChatLog([...newLog, { role: 'ai', text: response.data.answer }]); } catch(err) { alert("Error."); } finally { setIsProcessing(false); }
  };
  return (<div className="tool-workspace" style={{maxWidth:'800px'}}><div className="breadcrumb" onClick={() => window.location.href='/'}>← Back</div><div className="page-header"><h1>Chat with PDF</h1><p>Ask our AI assistant questions.</p></div>{files.length === 0 ? (<MassiveDropzone accept=".pdf" isMultiple={false} onFilesSelected={setFiles} files={files} />) : (<div style={{ background: 'var(--glass-card)', padding: '20px', borderRadius: '24px', border: '1px solid var(--border-soft)', minHeight: '500px', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-soft)' }}><div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', padding: '10px' }}>{chatLog.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '150px' }}><div style={{fontSize:'40px', marginBottom:'10px'}}>🤖</div><p>Document uploaded! Ask a question to begin.</p></div>}{chatLog.map((msg, idx) => (<div key={idx} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', marginBottom: '15px' }}><span style={{ display: 'inline-block', padding: '14px 20px', borderRadius: '20px', maxWidth: '80%', lineHeight: '1.5', fontSize: '15px', background: msg.role === 'user' ? 'var(--text-main)' : 'var(--bg-main)', color: msg.role === 'user' ? 'var(--bg-main)' : 'var(--text-main)', border: msg.role === 'ai' ? '1px solid var(--border-soft)' : 'none', borderBottomRightRadius: msg.role === 'user' ? '4px' : '20px', borderBottomLeftRadius: msg.role === 'ai' ? '4px' : '20px' }}>{msg.role === 'ai' && <strong>AI: </strong>} {msg.text}</span></div>))}</div><form onSubmit={handleProcess} style={{ display: 'flex', gap: '10px' }}><input type="text" className="input-field" style={{ margin: 0, flex: 1, borderRadius: '50px', paddingLeft: '25px' }} placeholder="Ask anything..." value={question} onChange={e => setQuestion(e.target.value)} required /><button type="submit" className="upload-btn" style={{ width: 'auto', borderRadius: '50px', padding: '0 30px' }} disabled={isProcessing}>Send</button></form></div>)}</div>);
}

// --- MAIN APP (SIDEBAR LAYOUT) ---
function MainApp() {
  const [userEmail, setUserEmailState] = useState(localStorage.getItem('userEmail') || null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const location = useLocation();
  const navigate = useNavigate();

  const setUserEmail = (email) => { if (email) localStorage.setItem('userEmail', email); else localStorage.removeItem('userEmail'); setUserEmailState(email); };
  const isGodMode = userEmail === 'singhashish63661@gmail.com';
  
  useEffect(() => { document.body.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); }, [theme]);
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) return <Routes><Route path="/login" element={<Login setUserEmail={setUserEmail} />} /></Routes>;

  return (
    <div className="app-layout">
      
      {/* THE AMBIENT MAGIC BACKGROUND */}
      <div className="ambient-bg"><div className="ambient-orb"></div></div>

      <div className="sidebar">
        <div className="brand-name" onClick={() => navigate('/')}><span>📄</span> PDF Master</div>
        <div className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}><span style={{fontSize: '18px'}}>🚀</span> Workspace</div>
        <div className={`sidebar-link ${location.pathname === '/account' ? 'active' : ''}`} onClick={() => navigate('/account')}><span style={{fontSize: '18px'}}>👤</span> My Account</div>
        {isGodMode && (<div className={`sidebar-link ${location.pathname === '/admin' ? 'active' : ''}`} onClick={() => navigate('/admin')}><span style={{fontSize: '18px'}}>👑</span> Admin HQ</div>)}
        <div className="sidebar-bottom">
          <div className="sidebar-link" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}><span style={{fontSize: '18px'}}>{theme === 'light' ? '🌙' : '☀️'}</span> {theme === 'light' ? 'Dark Mode' : 'Light Mode'}</div>
          <div className="sidebar-link" onClick={() => { setUserEmail(null); navigate('/login'); }} style={{color: '#ef4444'}}><span style={{fontSize: '18px'}}>🚪</span> Log Out</div>
        </div>
      </div>

      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/account" element={<AccountDashboard userEmail={userEmail} setUserEmail={setUserEmail} />} />
          <Route path="/admin" element={isGodMode ? <AdminDashboard /> : <Navigate to="/" />} />
          
          <Route path="/workflow" element={<WorkflowBuilder userEmail={userEmail} />} />
          <Route path="/compare" element={<ComparePDF userEmail={userEmail} />} />
          <Route path="/ats-scan" element={<AtsScanner userEmail={userEmail} />} />
          <Route path="/chat" element={<ChatWithPDF userEmail={userEmail} />} />
          
          <Route path="/metadata" element={<CustomInputTool title="Metadata Hacker" desc="Wipe hidden tracking data." endpoint="metadata" inputName="wipe" inputPlaceholder="Type 'true' to wipe" userEmail={userEmail} isCheckbox={true} />} />
          <Route path="/add-page-numbers" element={<ToolTemplate title="Page Numbers" desc="Add numbers to footer." accept=".pdf" endpoint="add-page-numbers" userEmail={userEmail} />} />
          
          <Route path="/pdf2audio" element={<ToolTemplate title="PDF to Audio" desc="Turn PDF into MP3." accept=".pdf" endpoint="pdf2audio" outputExt=".mp3" userEmail={userEmail} loadMessage="Generating Audio..." />} />
          <Route path="/flatten" element={<ToolTemplate title="Flatten PDF" desc="Anti-copy tool." accept=".pdf" endpoint="flatten" userEmail={userEmail} />} />
          <Route path="/merge" element={<ToolTemplate title="Merge PDF" desc="Combine PDFs." accept=".pdf" isMultiple={true} endpoint="merge" userEmail={userEmail} />} />
          <Route path="/split" element={<ToolTemplate title="Split PDF" desc="Extract pages." accept=".pdf" endpoint="split" outputExt=".zip" userEmail={userEmail} />} />
          <Route path="/compress" element={<ToolTemplate title="Compress PDF" desc="Reduce size." accept=".pdf" endpoint="compress" userEmail={userEmail} />} />
          <Route path="/crop" element={<ToolTemplate title="Crop PDF" desc="Trim margins." accept=".pdf" endpoint="crop" userEmail={userEmail} />} />
          <Route path="/img2pdf" element={<ToolTemplate title="Image to PDF" desc="JPG to PDF." accept="image/*" endpoint="img2pdf" userEmail={userEmail} />} />
          <Route path="/pdf2jpg" element={<ToolTemplate title="PDF to JPG" desc="Extract images." accept=".pdf" endpoint="pdf2jpg" outputExt=".zip" userEmail={userEmail} />} />
          <Route path="/pdf2word" element={<ToolTemplate title="PDF to Word" desc="PDF to Docx." accept=".pdf" endpoint="pdf2word" outputExt=".docx" userEmail={userEmail} />} />
          
          <Route path="/add-qrcode" element={<CustomInputTool title="Add QR Code" desc="Paste URL." endpoint="add-qrcode" inputName="url" inputPlaceholder="https://..." userEmail={userEmail} />} />
          <Route path="/remove-pages" element={<CustomInputTool title="Remove Pages" desc="e.g. 1, 3" endpoint="remove-pages" inputName="pages" inputPlaceholder="e.g. 1, 3" userEmail={userEmail} />} />
          <Route path="/rotate" element={<CustomInputTool title="Rotate PDF" desc="e.g. 90, 180" endpoint="rotate" inputName="degrees" inputPlaceholder="90" userEmail={userEmail} />} />
          <Route path="/watermark" element={<WatermarkPDF userEmail={userEmail} />} />
          <Route path="/remove-watermark" element={<CustomInputTool title="Remove Watermark" desc="Erase exact text." endpoint="remove-watermark" inputName="text" inputPlaceholder="e.g. DRAFT" userEmail={userEmail} />} />
          <Route path="/protect" element={<CustomInputTool title="Protect PDF" desc="Add a password" endpoint="protect" inputName="password" inputPlaceholder="Secret Password" userEmail={userEmail} />} />
          <Route path="/unlock" element={<CustomInputTool title="Unlock PDF" desc="Enter password" endpoint="unlock" inputName="password" inputPlaceholder="Current Password" userEmail={userEmail} />} />
          <Route path="/redact" element={<CustomInputTool title="Redact PDF" desc="Black out a word." endpoint="redact" inputName="word" inputPlaceholder="e.g. Secret" userEmail={userEmail} />} />
          <Route path="/extract" element={<TextExtractionTool title="Extract Text" desc="Copy text." endpoint="extract-text" isTranslate={false} userEmail={userEmail} />} />
          <Route path="/translate" element={<TextExtractionTool title="Translate PDF" desc="AI Translation." endpoint="translate" isTranslate={true} userEmail={userEmail} />} />
          <Route path="/sign" element={<SignPDF userEmail={userEmail} />} />
          <Route path="/repair" element={<ToolTemplate title="Repair PDF" desc="Fix broken PDF." accept=".pdf" endpoint="repair" userEmail={userEmail} />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter><MainApp /></BrowserRouter>
  );
}