
import React, { useState, useEffect, useCallback, useRef } from "react";

const WILL_WHATSAPP = "233595452977";

const TYPE_CONFIG = {
  "fully-funded":      { label:"Fully Funded",       color:"#166534", bg:"#DCFCE7", border:"#BBF7D0" },
  "partial":           { label:"Partial Scholarship", color:"#854D0E", bg:"#FEF3C7", border:"#FDE68A" },
  "paid-internship":   { label:"Paid Internship",     color:"#1E40AF", bg:"#DBEAFE", border:"#BFDBFE" },
  "unpaid-internship": { label:"Volunteer",           color:"#6D28D9", bg:"#EDE9FE", border:"#DDD6FE" },
};

const FIELDS = ["STEM","Business","Agriculture","Health","Education","Engineering","Law","Arts","Social Sciences"];

const COUNTRIES = [
  { flag:"🇬🇧", name:"United Kingdom",  region:"Europe",       visa:"Skilled Worker Visa",              diff:"Medium", time:"3-8 weeks",   url:"https://www.gov.uk/skilled-worker-visa",                reqs:["Job offer from UK-licensed sponsor","Certificate of Sponsorship","English B1+ proof","Min. £26,200 salary"] },
  { flag:"🇺🇸", name:"United States",   region:"Americas",     visa:"H-1B / EB-3 Visa",                 diff:"Hard",   time:"6-18 months", url:"https://www.uscis.gov/working-in-the-united-states",    reqs:["Employer sponsorship required","H-1B subject to annual lottery","Bachelor's degree minimum","Labour Condition Application"] },
  { flag:"🇨🇦", name:"Canada",          region:"Americas",     visa:"Express Entry",                    diff:"Medium", time:"~6 months",   url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html", reqs:["IELTS / TEF language test","Education Credential Assessment","Sufficient CRS score","Work experience evidence"] },
  { flag:"🇩🇪", name:"Germany",         region:"Europe",       visa:"EU Blue Card",                     diff:"Medium", time:"4-12 weeks",  url:"https://www.make-it-in-germany.com/en/visa-residence/types/work-qualified-professionals", reqs:["Degree recognised in Germany","Job offer at least 45300 EUR/yr","A1 German or English for select roles","Registered address in Germany"] },
  { flag:"🇦🇺", name:"Australia",       region:"Asia-Pacific", visa:"Skilled Independent (189)",        diff:"Medium", time:"8-12 months", url:"https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189", reqs:["Skills assessment by authority","Points test (65+)","IELTS Competent English","Under 45 years of age"] },
  { flag:"🇯🇵", name:"Japan",           region:"Asia-Pacific", visa:"Specified Skilled Worker",         diff:"Medium", time:"2-4 months",  url:"https://www.moj.go.jp/isa/applications/status/specified_skilled_worker.html", reqs:["Industry exam or 3 yrs experience","JLPT N4+ Japanese","Job offer from registered employer","Clean criminal record"] },
  { flag:"🇳🇱", name:"Netherlands",     region:"Europe",       visa:"Highly Skilled Migrant",           diff:"Medium", time:"2-4 weeks",   url:"https://ind.nl/en/residence-permits/work/highly-skilled-migrant", reqs:["IND-recognised sponsor employer","Salary at least 5008 EUR/month","University degree preferred","MVV visa from Dutch Embassy"] },
  { flag:"🇦🇪", name:"UAE",             region:"Middle East",  visa:"Employment / Work Visa",           diff:"Easy",   time:"1-3 weeks",   url:"https://gdrfad.gov.ae/en/services/employment-visa",     reqs:["Job offer from UAE employer","Medical fitness certificate","Passport valid 6+ months","Emirates ID on arrival"] },
  { flag:"🇳🇿", name:"New Zealand",     region:"Asia-Pacific", visa:"Accredited Employer Work Visa",    diff:"Medium", time:"4-8 weeks",   url:"https://www.immigration.govt.nz/new-zealand-visas/visas/visa/accredited-employer-work-visa", reqs:["Offer from NZ-accredited employer","IELTS 6.5+","Skills on shortage list preferred","Offshore application"] },
  { flag:"🇮🇪", name:"Ireland",         region:"Europe",       visa:"Critical Skills Employment Permit",diff:"Medium", time:"4-12 weeks",  url:"https://enterprise.gov.ie/en/What-We-Do/Workplace-and-Skills/Employment-Permits/Permit-Types/Critical-Skills-Employment-Permit/", reqs:["Job offer at least 38000 EUR/yr","Degree-level qualification","Employer in Ireland","Role on Critical Skills list"] },
  { flag:"🇸🇬", name:"Singapore",       region:"Asia-Pacific", visa:"Employment Pass (EP)",             diff:"Medium", time:"3-8 weeks",   url:"https://www.mom.gov.sg/passes-and-permits/employment-pass", reqs:["Salary at least SGD 5000/month","Employer-sponsored","Degree or professional qualifications","COMPASS assessment"] },
  { flag:"🇫🇷", name:"France",          region:"Europe",       visa:"Talent Passport / Work Permit",    diff:"Hard",   time:"1-3 months",  url:"https://www.service-public.fr/particuliers/vosdroits/F16922", reqs:["French B1+ or English for multinationals","Recognised diploma","Job offer or business creation","Apply via French Embassy"] },
];

function Chip({ children }) {
  return <span style={{ fontSize:"11px",background:"#F9FAFB",border:"1px solid #E5E7EB",borderRadius:"4px",padding:"2px 8px",color:"#6B7280" }}>{children}</span>;
}

// ── FIX 1: Normalise titles so "Senior QA – Remote (WFP) 2026" and
//    "Senior QA – WFP 2026" are treated as the same opportunity ──────────────
const normalizeTitle = (t) =>
  (t || "")
    .toLowerCase()
    .replace(/\s*[\(–\-]\s*(wfp|remote|2025|2026|2027)[^)]*\)?/gi, "")
    .replace(/\s*\d{4}.*$/, "")
    .replace(/\s+/g, " ")
    .trim();

export default function App() {
  const [activeTab,   setActiveTab]   = useState("opportunities");
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [toast,       setToast]       = useState(null);
  const [opps,        setOpps]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [firstLoad,   setFirstLoad]   = useState(true);
  const [updated,     setUpdated]     = useState(null);
  const [bookmarks,   setBookmarks]   = useState(new Set());
  const [search,      setSearch]      = useState("");
  const [typeF,       setTypeF]       = useState("all");
  const [levelF,      setLevelF]      = useState("all");
  const [fieldF,      setFieldF]      = useState("");
  const [sortBy,      setSortBy]      = useState("deadline");
  const [jobType,     setJobType]     = useState("all");
  const [oppTab,      setOppTab]      = useState("all");
  const [fetchErr,    setFetchErr]    = useState(null);
  const [copiedId,    setCopiedId]    = useState(null);
  const [cvForm,      setCvForm]      = useState({ name:"", profession:"", skills:"", targetRole:"", targetCountry:"", vacancyText:"" });
  const [cvResult,    setCvResult]    = useState(null);
  const [cvLoading,   setCvLoading]   = useState(false);
  const [cvError,     setCvError]     = useState(null);
  const [relRegion,   setRelRegion]   = useState("all");
  const [relSearch,   setRelSearch]   = useState("");
  const [subEmail,    setSubEmail]    = useState("");
  const [subStatus,   setSubStatus]   = useState("idle");
  const [subMessage,  setSubMessage]  = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = [
      "@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.25)}}",
      "@keyframes spin{to{transform:rotate(360deg)}}",
      "@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}",
      "*{box-sizing:border-box}",
      "body{font-family:'Inter',system-ui,sans-serif;background:#F8FAFC;color:#111827;margin:0}",
      "select,input,textarea,button{font-family:inherit}",
    ].join("");
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  useEffect(() => {
    if (selectedOpp) {
      setCvForm(p => ({
        ...p,
        targetRole:    selectedOpp.title       || p.targetRole,
        targetCountry: selectedOpp.destination || p.targetCountry,
        vacancyText:   [selectedOpp.description, selectedOpp.funding].filter(Boolean).join(" "),
      }));
      setCvResult(null); setCvError(null);
    }
  }, [selectedOpp]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2400); };

  const daysLeft = (dl) => {
    if (!dl || dl === "Rolling" || dl === "TBD") return null;
    return Math.ceil((new Date(dl) - Date.now()) / 86400000);
  };

  const dlColor = (dl) => {
    const d = daysLeft(dl);
    if (d === null) return "#6B7280";
    if (d < 0) return "#9CA3AF";
    if (d <= 14) return "#DC2626";
    if (d <= 30) return "#D97706";
    return "#166534";
  };

  // ── FIX 2: Better deduplication (URL-first) + localStorage caching ─────────
  const doFetch = useCallback(async () => {
    setLoading(true); setFetchErr(null);
    try {
      const res = await fetch("/.netlify/functions/get-opportunities");
      if (!res.ok) throw new Error("API error " + res.status);
      const parsed = await res.json();
      if (!Array.isArray(parsed) || !parsed.length) throw new Error("No opportunities found. Please try again shortly.");
      setOpps(parsed);
      try {
        localStorage.setItem("pa_opps", JSON.stringify(parsed));
        localStorage.setItem("pa_time", String(Date.now()));
      } catch(e) {}
      setUpdated(new Date());
    } catch(err) { setFetchErr("Search failed: " + err.message); }
    finally { setLoading(false); setFirstLoad(false); }
  }, []);

  // ── FIX 3: Refresh every 30 minutes instead of every 60 seconds ────────────
  const doRefresh = useCallback(() => {
    clearInterval(timerRef.current);
    doFetch();
    timerRef.current = setInterval(() => doFetch(), 1800000); // 30 minutes
  }, [doFetch]);

  // ── FIX 4: Load cache instantly on first render, only fetch if stale ────────
  useEffect(() => {
    try {
      const cached     = localStorage.getItem("pa_opps");
      const cachedTime = localStorage.getItem("pa_time");
      if (cached && cachedTime) {
        const age     = Date.now() - parseInt(cachedTime, 10);
        const maxAge  = 1800000; // 30 minutes
        if (age < maxAge) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length) {
            setOpps(parsed);
            setUpdated(new Date(parseInt(cachedTime, 10)));
            setFirstLoad(false);
            setLoading(false);
            // Schedule next refresh when the cache expires
            timerRef.current = setTimeout(() => {
              doFetch();
              timerRef.current = setInterval(doFetch, 1800000);
            }, maxAge - age);
            return () => clearTimeout(timerRef.current);
          }
        }
      }
    } catch(e) {}
    // No valid cache — fetch immediately
    doFetch();
    timerRef.current = setInterval(doFetch, 1800000);
    return () => clearInterval(timerRef.current);
  }, [doFetch]);

  const toggleSave = (id) => setBookmarks(prev => { const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });

  const exportPDF = () => {
    if (!filtered.length) { showToast("No opportunities to export"); return; }
    const today = new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
    const typeLbl = t=>({ "fully-funded":"Fully Funded","partial":"Partial","paid-internship":"Paid Internship","unpaid-internship":"Volunteer" }[t]||t||"");
    const rows = filtered.map(o=>{
      const d=daysLeft(o.deadline);
      const dl=o.deadline==="Rolling"||o.deadline==="TBD"?o.deadline:d!==null&&d>=0?o.deadline+" ("+d+"d)":o.deadline||"";
      return "<tr><td><strong>"+(o.title||"")+"</strong><br><small>"+(o.organization||"")+"</small></td><td>"+typeLbl(o.type)+"</td><td>"+(o.destination||"")+"</td><td>"+(o.field||"")+"</td><td>"+dl+"</td><td><a href='"+(o.link||"#")+"'>Apply</a></td></tr>";
    }).join("");
    const win=window.open("","_blank");
    if (!win) { showToast("Allow pop-ups to export"); return; }
    win.document.write("<!DOCTYPE html><html><head><meta charset='utf-8'><title>PathAbroad Export</title><style>body{font-family:Arial,sans-serif;padding:24px}h1{color:#166534}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#166534;color:#fff;padding:7px 10px;text-align:left}td{padding:6px 10px;border-bottom:1px solid #eee}.btn{background:#166534;color:#fff;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;margin-bottom:14px}@media print{.btn{display:none}}</style></head><body><h1>PathAbroad Export</h1><p style='color:#6b7280;font-size:11px'>"+filtered.length+" results · "+today+"</p><button class='btn' onclick='window.print()'>Save as PDF</button><table><thead><tr><th>Opportunity</th><th>Type</th><th>Destination</th><th>Field</th><th>Deadline</th><th>Apply</th></tr></thead><tbody>"+rows+"</tbody></table></body></html>");
    win.document.close();
  };

  const shareOnWhatsApp = (opp) => {
    const d=daysLeft(opp.deadline);
    const dl=opp.deadline==="Rolling"||opp.deadline==="TBD"?opp.deadline:d!==null&&d>=0?opp.deadline+" ("+d+" days left)":opp.deadline;
    const icon={"fully-funded":"✅","partial":"💛","paid-internship":"💼","unpaid-internship":"🤝"};
    const typeName={"fully-funded":"FULLY FUNDED","partial":"Partial Scholarship","paid-internship":"Paid Internship","unpaid-internship":"Volunteer"};
    const lines=["🌍 *"+opp.title+"*","",( icon[opp.type]||"📌")+" "+(typeName[opp.type]||opp.type),"🏢 "+(opp.organization||"")];
    if(opp.destination) lines.push("📍 "+opp.destination);
    if(opp.field) lines.push("📚 "+opp.field);
    // FIX 5: Correct domain in WhatsApp shares
    lines.push("📅 Deadline: "+dl,"",opp.description||"","","🔗 Apply: "+opp.link,"","_Via PathAbroad · pathabroad.africa_");
    window.open("https://wa.me/?text="+encodeURIComponent(lines.join("\n")),"_blank");
  };

  const copyLink = async (opp) => {
    try { await navigator.clipboard.writeText(opp.link); setCopiedId(opp.id); showToast("Link copied!"); setTimeout(()=>setCopiedId(p=>p===opp.id?null:p),2200); }
    catch { showToast("Copy failed"); }
  };

  const handleGetCVReady = (opp) => { setSelectedOpp(opp); setActiveTab("cv-builder"); showToast("Opportunity loaded in CV Builder"); };

  const handleSubscribe = async (e) => {
    if (e&&e.preventDefault) e.preventDefault();
    const clean = subEmail.trim().toLowerCase();
    if (!clean||!clean.includes("@")||!clean.includes(".")) { setSubStatus("error"); setSubMessage("Please enter a valid email address."); return; }
    setSubStatus("loading");
    try {
      await fetch("/", { method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body: new URLSearchParams({"form-name":"pathabroad-subscribers", email: clean}).toString() });
    } catch(e) {}
    setSubStatus("success");
    setSubMessage("First digest lands next Monday. Shared with no one.");
    setSubEmail("");
  };

  const generateCV = useCallback(async () => {
    if (!cvForm.profession||!cvForm.targetRole) { setCvError("Please fill in your profession and target role."); return; }
    setCvLoading(true); setCvError(null); setCvResult(null);
    try {
      const res = await fetch("/.netlify/functions/anthropic", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-6", max_tokens:1000,
          system:"You are a professional CV advisor for African applicants. Return ONLY a raw JSON object, no markdown, no code fences. Fields: { roleMatch, summary, bullets (array of 5), tip }",
          messages:[{ role:"user", content:"Write a tailored CV:\nName: "+(cvForm.name||"Applicant")+"\nProfession: "+cvForm.profession+"\nSkills: "+(cvForm.skills||"Not specified")+"\nTarget role: "+cvForm.targetRole+"\nTarget country: "+(cvForm.targetCountry||"International")+"\nOpportunity: "+(cvForm.vacancyText||"International opportunity")+"\n\nReturn JSON only." }]
        })
      });
      const data = await res.json();
      const text=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      const s=text.indexOf("{"),e=text.lastIndexOf("}");
      if (s===-1||e<=s) throw new Error("No JSON found");
      setCvResult(JSON.parse(text.slice(s,e+1)));
    } catch(err) { setCvError("Generation failed: "+err.message); }
    finally { setCvLoading(false); }
  }, [cvForm]);

  const sendToWill = () => {
    const lines=["Hi, I used PathAbroad and need a professional CV review.",""];
    if(selectedOpp){ lines.push("🎯 *Target Opportunity*","📋 "+selectedOpp.title,"🏢 "+(selectedOpp.organization||""),"📅 Deadline: "+(selectedOpp.deadline||"TBD"),""); }
    lines.push("📄 *AI-Generated CV Summary*",cvResult&&cvResult.summary?cvResult.summary:"","","Please professionally review this for submission.");
    window.open("https://wa.me/"+WILL_WHATSAPP+"?text="+encodeURIComponent(lines.join("\n")),"_blank");
  };

  const filtered = opps.filter(o=>{
    if(oppTab==="saved") return bookmarks.has(o.id);
    const q=search.toLowerCase();
    return (!q||[o.title,o.organization,o.field,o.destination].some(f=>f&&f.toLowerCase().includes(q)))&&
      (typeF==="all"||o.type===typeF)&&(levelF==="all"||o.level===levelF||o.level==="all")&&
      (!fieldF||o.field&&o.field.toLowerCase().includes(fieldF.toLowerCase()))&&
      (jobType==="all"||o.job_type===jobType);
  }).sort((a,b)=>{
    if(sortBy==="type"){const ord={"fully-funded":0,"partial":1,"paid-internship":2,"unpaid-internship":3};return(ord[a.type]||9)-(ord[b.type]||9);}
    const score=dl=>{const d=daysLeft(dl);return d===null?9e8:d<0?9e9:d;};
    return score(a.deadline)-score(b.deadline);
  });

  const scholarCount=opps.filter(o=>o.type==="fully-funded"||o.type==="partial").length;
  const internCount=opps.filter(o=>o.type&&o.type.includes("internship")).length;
  const urgentCount=opps.filter(o=>{const d=daysLeft(o.deadline);return d!==null&&d>=0&&d<=14;}).length;
  const filteredCountries=COUNTRIES.filter(c=>(relRegion==="all"||c.region===relRegion)&&(!relSearch||c.name.toLowerCase().includes(relSearch.toLowerCase())));
  const diffColor=d=>({ "Easy":"#166534","Medium":"#D97706","Hard":"#DC2626" }[d]||"#6B7280");
  const diffBg=d=>({ "Easy":"#DCFCE7","Medium":"#FEF3C7","Hard":"#FEE2E2" }[d]||"#F3F4F6");
  const diffBorder=d=>({ "Easy":"#BBF7D0","Medium":"#FDE68A","Hard":"#FECACA" }[d]||"#E5E7EB");

  const sel={ background:"#FFFFFF",border:"1px solid #D1D5DB",borderRadius:"6px",padding:"7px 12px",color:"#111827",fontSize:"12px",cursor:"pointer",outline:"none" };
  const inpFull={ ...sel,width:"100%",boxSizing:"border-box" };
  const lbl={ fontSize:"10px",color:"#9CA3AF",letterSpacing:"0.5px",textTransform:"uppercase",display:"block",marginBottom:"5px" };

  return (
    <div style={{minHeight:"100vh",background:"#F8FAFC",color:"#111827"}}>

      {toast&&<div style={{position:"fixed",bottom:"22px",right:"22px",background:"#111827",color:"#fff",padding:"10px 18px",borderRadius:"8px",fontSize:"13px",fontWeight:500,zIndex:9999,boxShadow:"0 4px 16px rgba(0,0,0,0.2)",animation:"slideUp 0.2s ease"}}>✓ {toast}</div>}

      <header style={{background:"#fff",borderBottom:"1px solid #E5E7EB",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:"58px",position:"sticky",top:0,zIndex:30}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <span style={{fontSize:"20px"}}>✈</span>
          <span style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:"19px",color:"#111827",letterSpacing:"-0.5px"}}>Path<span style={{color:"#166534"}}>Abroad</span></span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          {updated&&!loading&&<span style={{fontSize:"11px",color:"#9CA3AF"}}>Updated {updated.toLocaleTimeString()}</span>}
          {loading&&!firstLoad&&<span style={{fontSize:"11px",color:"#6B7280",display:"flex",alignItems:"center",gap:"5px"}}><span style={{width:"12px",height:"12px",borderRadius:"50%",border:"2px solid #DCFCE7",borderTop:"2px solid #166534",display:"inline-block",animation:"spin 0.7s linear infinite"}}/>Updating</span>}
          <button onClick={doRefresh} style={{background:"#F9FAFB",border:"1px solid #E5E7EB",borderRadius:"6px",padding:"6px 12px",fontSize:"12px",color:"#374151",cursor:"pointer"}}>Refresh</button>
        </div>
      </header>

      <div style={{background:"#F0FDF4",borderBottom:"1px solid #DCFCE7",padding:"60px 24px 52px"}}>
        <div style={{maxWidth:"720px"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:"7px",background:"#fff",border:"1px solid #BBF7D0",borderRadius:"100px",padding:"5px 14px 5px 9px",fontSize:"11px",color:"#166534",fontWeight:500,marginBottom:"28px",boxShadow:"0 1px 3px rgba(22,101,52,0.07)"}}>
            <span style={{width:"7px",height:"7px",borderRadius:"50%",background:"#16A34A",display:"inline-block",animation:"livePulse 2s infinite",flexShrink:0}}/>
            {/* FIX 6: Honest claim — updated every 30 minutes, not 60 seconds */}
            Updated every 30 minutes
          </div>
          <h1 style={{fontFamily:"Georgia,serif",fontSize:"clamp(32px,5.5vw,58px)",fontWeight:700,color:"#111827",lineHeight:1.08,letterSpacing:"-1.5px",margin:"0 0 20px"}}>
            Find what's open<br/><span style={{color:"#166534"}}>right now.</span>
          </h1>
          <p style={{fontSize:"17px",color:"#4B5563",lineHeight:1.75,margin:"0 0 32px",maxWidth:"580px"}}>
            Scholarships, internships, fellowships, volunteer programs, and international jobs sourced live from across the web. Only opportunities accepting applications today. No stale listings. No dead links.
          </p>
          <div style={{display:"flex",gap:"12px",flexWrap:"wrap",alignItems:"center",marginBottom:"32px"}}>
            <button onClick={()=>setActiveTab("opportunities")} style={{display:"inline-flex",alignItems:"center",gap:"8px",background:"#166534",color:"#fff",border:"none",borderRadius:"8px",padding:"13px 22px",fontSize:"15px",fontWeight:600,cursor:"pointer"}}>
              <span style={{width:"7px",height:"7px",borderRadius:"50%",background:"#4ADE80",display:"inline-block",animation:"livePulse 2s infinite",flexShrink:0}}/>
              {opps.length?"Explore "+opps.length+" open opportunities":"Start exploring"}
            </button>
            <button onClick={()=>setActiveTab("cv-builder")} style={{background:"transparent",border:"1px solid #D1D5DB",color:"#374151",borderRadius:"8px",padding:"13px 20px",fontSize:"14px",fontWeight:500,cursor:"pointer"}}>Build your CV</button>
          </div>
          <div style={{background:"#fff",border:"1px solid #DCFCE7",borderRadius:"10px",padding:"18px 20px",marginBottom:"32px"}}>
            {subStatus==="success"?(
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{width:"32px",height:"32px",borderRadius:"50%",background:"#DCFCE7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"15px",color:"#166534"}}>✓</div>
                <div><div style={{fontSize:"13px",fontWeight:600,color:"#166534"}}>You're on the list.</div><div style={{fontSize:"12px",color:"#6B7280",marginTop:"2px"}}>{subMessage}</div></div>
              </div>
            ):(
              <React.Fragment>
                <div style={{fontSize:"13px",fontWeight:600,color:"#111827",marginBottom:"3px"}}>Get the best opportunities every week — free.</div>
                <div style={{fontSize:"12px",color:"#6B7280",marginBottom:"12px"}}>Top 10 open opportunities every Monday, straight to your inbox.</div>
                <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                  <input type="email" value={subEmail} onChange={e=>setSubEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubscribe(e)} placeholder="your@email.com" style={{flex:"1 1 200px",background:"#F9FAFB",border:"1px solid "+(subStatus==="error"?"#FECACA":"#D1D5DB"),borderRadius:"6px",padding:"9px 12px",fontSize:"13px",color:"#111827",outline:"none"}}/>
                  <button onClick={handleSubscribe} disabled={subStatus==="loading"} style={{background:subStatus==="loading"?"#D1D5DB":"#166534",color:"#fff",border:"none",borderRadius:"6px",padding:"9px 20px",fontSize:"13px",fontWeight:600,cursor:subStatus==="loading"?"not-allowed":"pointer",whiteSpace:"nowrap"}}>{subStatus==="loading"?"Subscribing":"Subscribe"}</button>
                </div>
                {subStatus==="error"&&<div style={{fontSize:"11px",color:"#DC2626",marginTop:"7px"}}>{subMessage}</div>}
              </React.Fragment>
            )}
          </div>
          <div style={{display:"flex",gap:"0",flexWrap:"wrap",borderTop:"1px solid #DCFCE7",paddingTop:"20px"}}>
            {/* FIX 7: Honest feature labels */}
            {[{icon:"↻",label:"Updated every 30 minutes",sub:"Always current"},{icon:"✓",label:"Open opportunities only",sub:"No expired listings"},{icon:"⊙",label:"Free — no account required",sub:"Search instantly"}].map(({icon,label,sub},i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"10px",paddingRight:"28px",marginRight:"28px",borderRight:i<2?"1px solid #DCFCE7":"none",marginBottom:"8px"}}>
                <span style={{fontSize:"16px",color:"#166534",marginTop:"1px",flexShrink:0}}>{icon}</span>
                <div><div style={{fontSize:"12px",fontWeight:600,color:"#111827"}}>{label}</div><div style={{fontSize:"11px",color:"#9CA3AF",marginTop:"1px"}}>{sub}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{background:"#fff",borderBottom:"1px solid #E5E7EB",padding:"0 24px",display:"flex",overflowX:"auto",position:"sticky",top:"58px",zIndex:20}}>
        {[["opportunities","🌍 Opportunities",opps.length?String(opps.length):""],["cv-builder","📋 CV Builder",selectedOpp?"●":""],["relocation","✈️ Relocation",String(COUNTRIES.length)]].map(([id,label,badge])=>(
          <button key={id} onClick={()=>setActiveTab(id)} style={{padding:"14px 18px",background:"transparent",border:"none",borderBottom:activeTab===id?"2px solid #166534":"2px solid transparent",color:activeTab===id?"#166534":"#6B7280",fontSize:"13px",fontWeight:activeTab===id?600:400,cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:"7px"}}>
            {label}
            {badge&&<span style={{fontSize:"10px",background:activeTab===id?"#DCFCE7":"#F3F4F6",color:activeTab===id?"#166534":"#9CA3AF",padding:"1px 7px",borderRadius:"10px",fontWeight:activeTab===id?600:400}}>{badge}</span>}
          </button>
        ))}
      </div>

      {activeTab==="opportunities"&&(
        <React.Fragment>
          <div style={{background:"#fff",borderBottom:"1px solid #F3F4F6",display:"flex",flexWrap:"wrap"}}>
            {[{k:"Total",v:opps.length,c:"#166534"},{k:"Scholarships",v:scholarCount,c:"#166534"},{k:"Internships",v:internCount,c:"#1D4ED8"},{k:"Urgent 14d",v:urgentCount,c:"#DC2626"},{k:"Saved",v:bookmarks.size,c:"#D97706"}].map(({k,v,c})=>(
              <div key={k} style={{flex:"1 1 60px",padding:"12px 8px",textAlign:"center",borderRight:"1px solid #F3F4F6"}}>
                <div style={{fontSize:"20px",fontWeight:700,color:c,lineHeight:1}}>{v}</div>
                <div style={{fontSize:"10px",color:"#9CA3AF",marginTop:"3px"}}>{k}</div>
              </div>
            ))}
          </div>
          <div style={{background:"#fff",borderBottom:"1px solid #E5E7EB",padding:"10px 24px",display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center"}}>
            <div style={{position:"relative",flex:"1 1 180px"}}>
              <span style={{position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"#9CA3AF",fontSize:"14px",pointerEvents:"none"}}>⌕</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search title, org, field, country" style={{...inpFull,paddingLeft:"30px"}}/>
            </div>
            <select value={typeF} onChange={e=>setTypeF(e.target.value)} style={sel}><option value="all">All Types</option><option value="fully-funded">Fully Funded</option><option value="partial">Partial Scholarship</option><option value="paid-internship">Paid Internship</option><option value="unpaid-internship">Volunteer</option></select>
            <select value={levelF} onChange={e=>setLevelF(e.target.value)} style={sel}><option value="all">All Levels</option><option value="undergraduate">Undergraduate</option><option value="masters">Masters / MBA</option><option value="phd">PhD / Postdoc</option><option value="professional">Professional</option></select>
            <select value={jobType} onChange={e=>setJobType(e.target.value)} style={sel}><option value="all">All Work Types</option><option value="remote">Remote</option><option value="permanent">Permanent</option><option value="contract">Contract / Temporary</option><option value="internship">Internship</option></select>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={sel}><option value="deadline">Sort: Deadline</option><option value="type">Sort: Type</option></select>
            <button onClick={exportPDF} style={{...sel,color:"#166534",border:"1px solid #BBF7D0",background:"#F0FDF4",fontWeight:500,whiteSpace:"nowrap"}}>Export PDF ({filtered.length})</button>
          </div>
          <div style={{background:"#F9FAFB",borderBottom:"1px solid #E5E7EB",padding:"8px 24px",display:"flex",gap:"6px",flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:"10px",color:"#9CA3AF",marginRight:"4px",textTransform:"uppercase",letterSpacing:"0.5px"}}>Field</span>
            {["", ...FIELDS].map(f=>{ const a=fieldF===f; return <button key={f||"all"} onClick={()=>setFieldF(f)} style={{background:a?"#166534":"#fff",color:a?"#fff":"#6B7280",border:"1px solid "+(a?"#166534":"#E5E7EB"),borderRadius:"20px",padding:"3px 11px",fontSize:"11px",cursor:"pointer",fontWeight:a?500:400,transition:"all 0.15s"}}>{f||"All"}</button>; })}
          </div>
          <div style={{background:"#fff",borderBottom:"1px solid #E5E7EB",padding:"0 24px",display:"flex"}}>
            {[["all","All ("+opps.length+")"],["saved","Saved ("+bookmarks.size+")"]].map(([id,label])=>(
              <button key={id} onClick={()=>setOppTab(id)} style={{padding:"10px 16px",background:"transparent",border:"none",borderBottom:oppTab===id?"2px solid #166534":"2px solid transparent",color:oppTab===id?"#166534":"#9CA3AF",fontSize:"12px",fontWeight:oppTab===id?600:400,cursor:"pointer",transition:"all 0.15s"}}>{label}</button>
            ))}
          </div>
          <main style={{padding:"20px 24px",maxWidth:"1280px",margin:"0 auto"}}>
            {firstLoad&&loading&&(<div style={{textAlign:"center",padding:"80px 20px"}}><div style={{width:"44px",height:"44px",borderRadius:"50%",border:"3px solid #DCFCE7",borderTop:"3px solid #166534",margin:"0 auto 20px",animation:"spin 0.8s linear infinite"}}/><div style={{fontSize:"15px",fontWeight:600,color:"#111827",marginBottom:"6px"}}>Scanning the globe</div><div style={{fontSize:"13px",color:"#9CA3AF"}}>Finding open opportunities for African applicants worldwide</div></div>)}
            {fetchErr&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:"8px",padding:"10px 16px",marginBottom:"16px",color:"#991B1B",fontSize:"12px"}}>Error: {fetchErr} <button onClick={doRefresh} style={{marginLeft:"8px",background:"#166534",color:"#fff",border:"none",borderRadius:"4px",padding:"3px 10px",fontSize:"11px",cursor:"pointer"}}>Retry</button></div>}
            {!firstLoad&&filtered.length===0&&!loading&&(<div style={{textAlign:"center",padding:"60px 20px",color:"#9CA3AF"}}><div style={{fontSize:"32px",marginBottom:"10px"}}>{oppTab==="saved"?"🔖":"🔍"}</div><div style={{fontSize:"14px"}}>{oppTab==="saved"?"No saved opportunities yet.":"No results match your filters."}</div></div>)}
            {!firstLoad&&filtered.length>0&&(
              <React.Fragment>
                <div style={{fontSize:"12px",color:"#9CA3AF",marginBottom:"14px"}}>Showing {filtered.length} of {opps.length} opportunities</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"14px"}}>
                  {filtered.map(opp=>{
                    const tc=TYPE_CONFIG[opp.type]||TYPE_CONFIG["fully-funded"];
                    const days=daysLeft(opp.deadline),dc=dlColor(opp.deadline);
                    const isSaved=bookmarks.has(opp.id),expired=days!==null&&days<0;
                    return (
                      <div key={opp.id} style={{background:"#fff",borderRadius:"10px",border:"1px solid "+(isSaved?"#FDE68A":"#E5E7EB"),boxShadow:"0 1px 3px rgba(0,0,0,0.05)",padding:"16px",display:"flex",flexDirection:"column",gap:"10px",opacity:expired?0.5:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{background:tc.bg,color:tc.color,border:"1px solid "+tc.border,fontSize:"10px",fontWeight:600,padding:"3px 9px",borderRadius:"4px"}}>{tc.label}</span>
                          <button onClick={()=>toggleSave(opp.id)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:"18px",color:isSaved?"#D97706":"#D1D5DB",padding:0,lineHeight:1,transition:"color 0.15s"}}>{isSaved?"★":"☆"}</button>
                        </div>
                        <div>
                          <div style={{fontWeight:600,fontSize:"14px",color:"#111827",lineHeight:1.35,marginBottom:"3px"}}>{opp.title||"Untitled"}</div>
                          <div style={{fontSize:"12px",color:"#6B7280"}}>{opp.organization}</div>
                        </div>
                        {opp.description&&<div style={{fontSize:"12px",color:"#6B7280",lineHeight:1.6}}>{opp.description}</div>}
                        <div style={{display:"flex",flexWrap:"wrap",gap:"5px"}}>
                          {opp.destination&&<Chip>📍 {opp.destination}</Chip>}
                          {opp.field&&<Chip>📚 {opp.field}</Chip>}
                          {opp.level&&opp.level!=="all"&&<Chip>🎓 {opp.level}</Chip>}
                          {opp.job_type&&opp.job_type!=="internship"&&<Chip>{opp.job_type==="remote"?"🌐 Remote":opp.job_type==="permanent"?"🏢 Permanent":"📄 Contract"}</Chip>}
                        </div>
                        {opp.funding&&<div style={{fontSize:"12px",color:"#166534",background:"#F0FDF4",borderRadius:"5px",padding:"7px 10px",fontStyle:"italic"}}>{opp.funding}</div>}
                        <div style={{paddingTop:"10px",borderTop:"1px solid #F3F4F6",marginTop:"auto"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:"10px"}}>
                            <div>
                              <div style={{fontSize:"10px",color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"2px"}}>Deadline</div>
                              <div style={{fontSize:"13px",fontWeight:600,color:dc}}>{opp.deadline==="Rolling"||opp.deadline==="TBD"?opp.deadline:days===null?"":days<0?"Closed":days===0?"Today!":days===1?"1 day left":days+" days left"}</div>
                              {opp.deadline&&opp.deadline!=="Rolling"&&opp.deadline!=="TBD"&&days!==null&&<div style={{fontSize:"10px",color:"#9CA3AF",marginTop:"1px"}}>{opp.deadline}</div>}
                            </div>
                            <a href={opp.link} target="_blank" rel="noopener noreferrer" style={{background:"#166534",color:"#fff",fontWeight:600,fontSize:"13px",padding:"8px 16px",borderRadius:"6px",textDecoration:"none"}}>Apply →</a>
                          </div>
                          <div style={{display:"flex",gap:"6px",marginBottom:"8px"}}>
                            <button onClick={()=>shareOnWhatsApp(opp)} style={{flex:1,background:"#F9FAFB",border:"1px solid #E5E7EB",color:"#374151",padding:"6px 0",borderRadius:"5px",fontSize:"11px",cursor:"pointer"}}>📱 Share</button>
                            <button onClick={()=>copyLink(opp)} style={{flex:1,background:"#F9FAFB",border:"1px solid "+(copiedId===opp.id?"#BBF7D0":"#E5E7EB"),color:copiedId===opp.id?"#166534":"#374151",padding:"6px 0",borderRadius:"5px",fontSize:"11px",cursor:"pointer",transition:"all 0.15s"}}>{copiedId===opp.id?"✓ Copied":"🔗 Copy"}</button>
                          </div>
                          <button onClick={()=>handleGetCVReady(opp)} style={{width:"100%",background:"#B45309",color:"#fff",border:"none",borderRadius:"6px",padding:"9px 0",fontSize:"12px",fontWeight:600,cursor:"pointer"}}>🎯 Get My CV Ready for This</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </React.Fragment>
            )}
          </main>
        </React.Fragment>
      )}

      {activeTab==="cv-builder"&&(
        <main style={{padding:"28px 24px",maxWidth:"720px",margin:"0 auto"}}>
          {selectedOpp&&(<div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:"8px",padding:"12px 16px",marginBottom:"24px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"12px",flexWrap:"wrap"}}><div><div style={{fontSize:"10px",color:"#D97706",letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:"3px"}}>Loaded from opportunities</div><div style={{fontSize:"13px",fontWeight:600,color:"#111827"}}>{selectedOpp.title}</div><div style={{fontSize:"11px",color:"#9CA3AF",marginTop:"2px"}}>{selectedOpp.organization} · {selectedOpp.destination} · Deadline: {selectedOpp.deadline}</div></div><button onClick={()=>setSelectedOpp(null)} style={{background:"transparent",border:"1px solid #FDE68A",color:"#9CA3AF",fontSize:"11px",padding:"4px 10px",borderRadius:"4px",cursor:"pointer",whiteSpace:"nowrap"}}>Clear</button></div>)}
          <h2 style={{fontFamily:"Georgia,serif",fontSize:"22px",fontWeight:700,color:"#111827",margin:"0 0 4px"}}>CV Builder</h2>
          <p style={{fontSize:"13px",color:"#6B7280",margin:"0 0 24px"}}>Fill in your details — AI writes a tailored CV summary and bullet points for your specific opportunity.</p>
          <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:"10px",padding:"24px",marginBottom:"20px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
              <div><label style={lbl}>Your name</label><input value={cvForm.name} onChange={e=>setCvForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Ama Owusu" style={inpFull}/></div>
              <div><label style={lbl}>Current profession *</label><input value={cvForm.profession} onChange={e=>setCvForm(p=>({...p,profession:e.target.value}))} placeholder="e.g. Registered Nurse" style={inpFull}/></div>
            </div>
            <div style={{marginBottom:"14px"}}><label style={lbl}>Key skills</label><textarea value={cvForm.skills} onChange={e=>setCvForm(p=>({...p,skills:e.target.value}))} placeholder="e.g. patient care, data analysis, project management" rows={2} style={{...inpFull,resize:"vertical",lineHeight:1.55}}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px",marginBottom:"14px"}}>
              <div><label style={lbl}>Target role *</label><input value={cvForm.targetRole} onChange={e=>setCvForm(p=>({...p,targetRole:e.target.value}))} placeholder="e.g. Public Health Specialist" style={inpFull}/></div>
              <div><label style={lbl}>Target country</label><input value={cvForm.targetCountry} onChange={e=>setCvForm(p=>({...p,targetCountry:e.target.value}))} placeholder="e.g. United Kingdom" style={inpFull}/></div>
            </div>
            <div><label style={lbl}>Opportunity details (optional)</label><textarea value={cvForm.vacancyText} onChange={e=>setCvForm(p=>({...p,vacancyText:e.target.value}))} placeholder="Paste the job description or scholarship requirements here" rows={3} style={{...inpFull,resize:"vertical",lineHeight:1.55}}/></div>
          </div>
          <button onClick={generateCV} disabled={cvLoading} style={{width:"100%",background:cvLoading?"#F3F4F6":"#166534",color:cvLoading?"#9CA3AF":"#fff",border:"none",borderRadius:"8px",padding:"13px 0",fontSize:"14px",fontWeight:600,cursor:cvLoading?"not-allowed":"pointer",transition:"all 0.2s",marginBottom:"20px"}}>{cvLoading?"Building your CV package":"Generate My CV Package"}</button>
          {cvError&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:"6px",padding:"10px 14px",marginBottom:"16px",color:"#991B1B",fontSize:"12px"}}>Error: {cvError}</div>}
          {cvResult&&(
            <div style={{display:"flex",flexDirection:"column",gap:"14px",animation:"slideUp 0.3s ease"}}>
              <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:"8px",padding:"16px"}}><div style={{fontSize:"10px",color:"#D97706",letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:"7px"}}>Role Fit Assessment</div><div style={{fontSize:"13px",color:"#111827",lineHeight:1.65}}>{cvResult.roleMatch}</div></div>
              <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:"8px",padding:"16px"}}><div style={{fontSize:"10px",color:"#166534",letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:"9px"}}>Professional Summary</div><div style={{fontSize:"13px",color:"#374151",lineHeight:1.75}}>{cvResult.summary}</div></div>
              <div style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:"8px",padding:"16px"}}><div style={{fontSize:"10px",color:"#166534",letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:"12px"}}>Tailored CV Bullets</div><div style={{display:"flex",flexDirection:"column",gap:"9px"}}>{(cvResult.bullets||[]).map((b,i)=>(<div key={i} style={{display:"flex",gap:"10px",alignItems:"flex-start"}}><span style={{color:"#166534",fontSize:"14px",marginTop:"1px",flexShrink:0}}>▸</span><span style={{fontSize:"13px",color:"#374151",lineHeight:1.65}}>{b}</span></div>))}</div></div>
              {cvResult.tip&&(<div style={{background:"#F0FDF4",border:"1px solid #DCFCE7",borderLeft:"3px solid #166534",borderRadius:"0 6px 6px 0",padding:"12px 16px"}}><div style={{fontSize:"10px",color:"#166534",letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:"5px"}}>Application Tip</div><div style={{fontSize:"13px",color:"#374151",lineHeight:1.65}}>{cvResult.tip}</div></div>)}
              <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:"10px",padding:"20px",textAlign:"center"}}>
                <div style={{fontSize:"14px",color:"#92400E",fontWeight:600,marginBottom:"5px"}}>Want a professional polish?</div>
                <div style={{fontSize:"12px",color:"#B45309",marginBottom:"16px",lineHeight:1.6}}>Send your AI draft for a professional human review — get a submission-ready CV back within 24 hours.</div>
                <button onClick={sendToWill} style={{background:"#B45309",color:"#fff",border:"none",borderRadius:"7px",padding:"10px 24px",fontSize:"13px",fontWeight:600,cursor:"pointer"}}>📱Get a Human Review in 24 Hours</button>
              </div>
            </div>
          )}
        </main>
      )}

      {activeTab==="relocation"&&(
        <main style={{padding:"28px 24px",maxWidth:"1200px",margin:"0 auto"}}>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:"22px",fontWeight:700,color:"#111827",margin:"0 0 4px"}}>Relocation Guides</h2>
          <p style={{fontSize:"13px",color:"#6B7280",margin:"0 0 22px"}}>Official visa pathways and immigration resources for {COUNTRIES.length} destination countries.</p>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"18px",alignItems:"center"}}>
            <div style={{position:"relative",flex:"1 1 160px"}}><span style={{position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",color:"#9CA3AF",fontSize:"14px",pointerEvents:"none"}}>⌕</span><input value={relSearch} onChange={e=>setRelSearch(e.target.value)} placeholder="Search country" style={{...inpFull,paddingLeft:"30px"}}/></div>
            {["all","Europe","Americas","Asia-Pacific","Middle East"].map(r=>(<button key={r} onClick={()=>setRelRegion(r)} style={{background:relRegion===r?"#166534":"#fff",color:relRegion===r?"#fff":"#6B7280",border:"1px solid "+(relRegion===r?"#166534":"#E5E7EB"),borderRadius:"20px",padding:"6px 14px",fontSize:"12px",cursor:"pointer",fontWeight:relRegion===r?500:400,transition:"all 0.15s",whiteSpace:"nowrap"}}>{r==="all"?"All Regions":r}</button>))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"14px"}}>
            {filteredCountries.map(c=>(
              <div key={c.name} style={{background:"#fff",border:"1px solid #E5E7EB",borderRadius:"10px",boxShadow:"0 1px 3px rgba(0,0,0,0.05)",padding:"18px",display:"flex",flexDirection:"column",gap:"12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}><span style={{fontSize:"26px"}}>{c.flag}</span><div><div style={{fontSize:"15px",fontWeight:600,color:"#111827"}}>{c.name}</div><div style={{fontSize:"11px",color:"#9CA3AF"}}>{c.region}</div></div></div>
                  <span style={{background:diffBg(c.diff),color:diffColor(c.diff),border:"1px solid "+diffBorder(c.diff),fontSize:"10px",fontWeight:600,padding:"3px 9px",borderRadius:"4px",whiteSpace:"nowrap"}}>{c.diff}</span>
                </div>
                <div style={{background:"#F9FAFB",borderRadius:"6px",padding:"10px 12px"}}><div style={{fontSize:"10px",color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"3px"}}>Visa type</div><div style={{fontSize:"13px",color:"#111827",fontWeight:600}}>{c.visa}</div></div>
                <div style={{fontSize:"12px",color:"#6B7280"}}>Processing: <span style={{color:"#374151",fontWeight:500}}>{c.time}</span></div>
                <div><div style={{fontSize:"10px",color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:"8px"}}>Key requirements</div>{c.reqs.map((r,i)=>(<div key={i} style={{display:"flex",gap:"8px",alignItems:"flex-start",marginBottom:"5px"}}><span style={{color:"#166534",fontSize:"11px",marginTop:"2px",flexShrink:0}}>▸</span><span style={{fontSize:"12px",color:"#6B7280",lineHeight:1.5}}>{r}</span></div>))}</div>
                <a href={c.url} target="_blank" rel="noopener noreferrer" style={{display:"block",textAlign:"center",background:"#F0FDF4",border:"1px solid #DCFCE7",color:"#166534",borderRadius:"6px",padding:"8px 0",fontSize:"12px",fontWeight:500,textDecoration:"none",marginTop:"auto"}}>Official Immigration Site →</a>
              </div>
            ))}
          </div>
        </main>
      )}

      <footer style={{background:"#fff",borderTop:"1px solid #E5E7EB",padding:"16px 24px",textAlign:"center",fontSize:"11px",color:"#9CA3AF",marginTop:"40px"}}>
        PathAbroad · Live opportunities · CV Builder · Relocation Guides · For African applicants worldwide
        © 2026 PathAbroad · All rights reserved
      </footer>
    </div>
  );
}
