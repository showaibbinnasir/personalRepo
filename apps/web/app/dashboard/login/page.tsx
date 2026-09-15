"use client";
import { FormEvent, useState } from "react";
import { API_URL } from "@/lib/api";

export default function Login(){
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError("");try{const r=await fetch(`${API_URL}/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({email,password})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Login failed");location.href="/dashboard";}catch(e:any){setError(e.message)}finally{setLoading(false)}}
  return <main className="login-page"><form className="login-card" onSubmit={submit}><small>PRIVATE ADMIN</small><h1>SBN CMS</h1><p>Manage the content that appears on your portfolio and powers the AI assistant.</p><label>Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/><label>Password</label><input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<p className="login-error">{error}</p>}<button disabled={loading}>{loading?"Signing in…":"Sign in"}</button></form></main>
}
