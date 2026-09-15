"use client";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import type { Portfolio } from "@/lib/types";
import ArrayEditor from "./ArrayEditor";
import ImageUploader from "./ImageUploader";

const nav = ["Overview","Profile","Experience","Education","Projects","Skills","Leadership","Certifications","Achievements","Languages","Socials","Site"];
const fields = {
  experience:[{key:"role",label:"Role"},{key:"organization",label:"Organisation"},{key:"location",label:"Location"},{key:"startDate",label:"Start date"},{key:"endDate",label:"End date"},{key:"current",label:"Current role",type:"checkbox" as const},{key:"description",label:"Responsibilities / achievements",type:"lines" as const,full:true}],
  education:[{key:"degree",label:"Degree"},{key:"institution",label:"Institution"},{key:"location",label:"Location"},{key:"startDate",label:"Start"},{key:"endDate",label:"End"},{key:"status",label:"Status"},{key:"description",label:"Description",type:"textarea" as const,full:true}],
  projects:[{key:"title",label:"Project title"},{key:"category",label:"Category"},{key:"summary",label:"Short summary",type:"textarea" as const,full:true},{key:"description",label:"Full description",type:"richtext" as const,full:true},{key:"tech",label:"Technologies",type:"csv" as const,full:true},{key:"imageUrl",label:"Cover image",type:"image" as const,full:true},{key:"liveUrl",label:"Live URL"},{key:"githubUrl",label:"GitHub URL"},{key:"featured",label:"Featured project",type:"checkbox" as const}],
  skills:[{key:"category",label:"Category"},{key:"skills",label:"Skills",type:"csv" as const,full:true}],
  leadership:[{key:"role",label:"Role"},{key:"organization",label:"Organisation"},{key:"startDate",label:"Start date"},{key:"endDate",label:"End date"},{key:"current",label:"Current role",type:"checkbox" as const},{key:"description",label:"Leadership impact",type:"lines" as const,full:true}],
  certifications:[{key:"name",label:"Certificate / course"},{key:"issuer",label:"Issuer"},{key:"date",label:"Date"},{key:"credentialUrl",label:"Credential URL",full:true}],
  achievements:[{key:"title",label:"Achievement"},{key:"organization",label:"Organisation"},{key:"date",label:"Date"},{key:"description",label:"Description",type:"textarea" as const,full:true}],
  languages:[{key:"name",label:"Language"},{key:"level",label:"Proficiency"}],
  socials:[{key:"label",label:"Platform"},{key:"url",label:"URL",full:true}]
};

export default function AdminDashboard(){
  const [data,setData]=useState<Portfolio|null>(null); const [tab,setTab]=useState("Overview"); const [status,setStatus]=useState("Loading…");
  useEffect(()=>{(async()=>{ const me=await fetch(`${API_URL}/auth/me`,{credentials:"include"}); if(!me.ok){location.href="/dashboard/login";return;} const r=await fetch(`${API_URL}/portfolio`); if(r.ok){setData(await r.json());setStatus("All changes are local until you save.");}})();},[]);
  async function save(){if(!data)return;setStatus("Saving…");const r=await fetch(`${API_URL}/portfolio/admin`,{method:"PUT",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(data)});setStatus(r.ok?"Saved successfully.":"Save failed.");if(r.ok)setData(await r.json());}
  async function logout(){await fetch(`${API_URL}/auth/logout`,{method:"POST",credentials:"include"});location.href="/dashboard/login";}
  if(!data)return <div className="login-page">Loading dashboard…</div>;
  const setProfile=(key:string,value:any)=>setData({...data,profile:{...data.profile,[key]:value}});
  const counts={Projects:data.projects.length,Experience:data.experiences.length,Skills:data.skillGroups.reduce((n,g)=>n+g.skills.length,0),Credentials:data.certifications.length+data.achievements.length};
  return <div className="dashboard-shell">
    <aside className="dashboard-sidebar"><h1>SBN CMS</h1><small>Portfolio control panel</small><div className="dashboard-nav">{nav.map(n=><button key={n} className={tab===n?"active":""} onClick={()=>setTab(n)}>{n}</button>)}</div><div className="sidebar-actions"><a href="/" target="_blank">Open portfolio ↗</a><button onClick={logout}>Log out</button></div></aside>
    <main className="dashboard-main"><div className="dashboard-top"><div><h2>{tab}</h2><span className="save-status">{status}</span></div><button className="save-button" onClick={save}>Save changes</button></div>
      {tab==="Overview"&&<><div className="field-grid">{Object.entries(counts).map(([k,v])=><div className="admin-card" key={k}><small>{k}</small><h2 style={{fontSize:56,margin:"8px 0 0"}}>{v}</h2></div>)}</div><div className="admin-card"><h3>How this dashboard works</h3><p>Edit any section, add or remove entries, upload images to ImgBB, then use <b>Save changes</b>. The public portfolio reads the latest MongoDB content immediately.</p><p>The AI assistant also reads this same portfolio data, so new projects and experience automatically become part of what visitors can ask about.</p></div></>}
      {tab==="Profile"&&<div className="admin-card"><div className="field-grid">
        {[['name','Full name'],['shortName','Display name'],['title','Professional title'],['location','Location'],['email','Email'],['phone','Phone'],['availability','Availability'],['resumeUrl','CV / resume URL']].map(([k,l])=><div className="field" key={k}><label>{l}</label><input value={(data.profile as any)[k]||""} onChange={e=>setProfile(k,e.target.value)}/></div>)}
        <div className="field full"><label>Hero statement</label><textarea value={data.profile.heroStatement} onChange={e=>setProfile('heroStatement',e.target.value)}/></div><div className="field full"><label>Biography</label><textarea value={data.profile.bio} onChange={e=>setProfile('bio',e.target.value)}/></div><div className="field full"><label>Portrait</label><ImageUploader value={data.profile.portraitUrl} onChange={v=>setProfile('portraitUrl',v)}/></div>
      </div></div>}
      {tab==="Experience"&&<ArrayEditor title="Experience" items={data.experiences} onChange={v=>setData({...data,experiences:v})} fields={fields.experience} blank={{role:"",organization:"",location:"",startDate:"",endDate:"",current:false,description:[]}} labelKey="role"/>}
      {tab==="Education"&&<ArrayEditor title="Education" items={data.education} onChange={v=>setData({...data,education:v})} fields={fields.education} blank={{degree:"",institution:"",location:"",startDate:"",endDate:"",status:"",description:""}} labelKey="degree"/>}
      {tab==="Projects"&&<ArrayEditor title="Project" items={data.projects} onChange={v=>setData({...data,projects:v})} fields={fields.projects} blank={{title:"",category:"",summary:"",description:"",tech:[],imageUrl:"",liveUrl:"",githubUrl:"",featured:false}} labelKey="title"/>}
      {tab==="Skills"&&<ArrayEditor title="Skill group" items={data.skillGroups} onChange={v=>setData({...data,skillGroups:v})} fields={fields.skills} blank={{category:"",skills:[]}} labelKey="category"/>}
      {tab==="Leadership"&&<ArrayEditor title="Leadership role" items={data.leadership} onChange={v=>setData({...data,leadership:v})} fields={fields.leadership} blank={{role:"",organization:"",startDate:"",endDate:"",current:false,description:[]}} labelKey="role"/>}
      {tab==="Certifications"&&<ArrayEditor title="Certification" items={data.certifications} onChange={v=>setData({...data,certifications:v})} fields={fields.certifications} blank={{name:"",issuer:"",date:"",credentialUrl:""}} labelKey="name"/>}
      {tab==="Achievements"&&<ArrayEditor title="Achievement" items={data.achievements} onChange={v=>setData({...data,achievements:v})} fields={fields.achievements} blank={{title:"",organization:"",date:"",description:""}} labelKey="title"/>}
      {tab==="Languages"&&<ArrayEditor title="Language" items={data.languages||[]} onChange={v=>setData({...data,languages:v})} fields={fields.languages} blank={{name:"",level:""}} labelKey="name"/>}
      {tab==="Socials"&&<ArrayEditor title="Social link" items={data.socialLinks} onChange={v=>setData({...data,socialLinks:v})} fields={fields.socials} blank={{label:"",url:""}} labelKey="label"/>}
      {tab==="Site"&&<div className="admin-card"><div className="field-grid">{[['accent','Accent colour'],['background','Background colour'],['foreground','Foreground colour'],['muted','Muted text colour'],['footerNote','Footer note']].map(([k,l])=><div className={`field ${k==='footerNote'?'full':''}`} key={k}><label>{l}</label><input value={(data.siteSettings as any)[k]||""} onChange={e=>setData({...data,siteSettings:{...data.siteSettings,[k]:e.target.value}})}/></div>)}</div></div>}
    </main>
  </div>;
}
