const BASE = "http://localhost:5000/api";

export const getToken    = () => localStorage.getItem("fa_token");
export const getUser     = () => JSON.parse(localStorage.getItem("fa_user")||"null");
export const saveSession = (tok,usr) => { localStorage.setItem("fa_token",tok); localStorage.setItem("fa_user",JSON.stringify(usr)); };
export const clearSession= () => { localStorage.removeItem("fa_token"); localStorage.removeItem("fa_user"); };

async function req(method, path, body=null, auth=true) {
  const headers = {"Content-Type":"application/json"};
  if (auth) {
    const t = getToken();
    if (!t) { clearSession(); window.location.href="admin-login.html"; throw new Error("Not authenticated"); }
    headers["Authorization"] = "Bearer "+t;
  }
  const opts = {method,headers};
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(BASE+path, opts);
  const data = await res.json().catch(()=>({message:"Invalid server response"}));
  if (!res.ok) {
    if (res.status===401) { clearSession(); window.location.href="admin-login.html"; throw new Error("Session expired. Please login again."); }
    const e=new Error(data.message||"Request failed"); e.status=res.status; e.data=data; throw e;
  }
  return data;
}

async function pub(method, path, body=null) {
  const headers = {"Content-Type":"application/json"};
  const opts = {method,headers};
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(BASE+path, opts);
  const data = await res.json().catch(()=>({message:"Invalid server response"}));
  if (!res.ok) { const e=new Error(data.message||"Request failed"); e.status=res.status; e.data=data; throw e; }
  return data;
}

export const Auth = {
  adminLogin: (email,password) => req("POST","/auth/admin/login",{email,password},false),
  logout() { clearSession(); window.location.href="index.html"; },
};

export const Students = {
  getAll:             (p={}) => req("GET",   "/students?"+new URLSearchParams(p)),
  getByRoll:          (roll) => req("GET",   "/students/roll/"+roll),
  create:             (data) => req("POST",  "/students",data),
  update:             (id,d) => req("PUT",   "/students/"+id,d),
  remove:             (id)   => req("DELETE","/students/"+id),
  getFaceDescriptors: ()     => pub("GET",   "/students/face-descriptors"),
  registerFace: (roll, descriptor, photo) =>
    req("POST","/students/register-face",{rollNumber:roll, descriptor:Array.from(descriptor), photoBase64:photo}),
};

export const ScanAPI = {
  mark:      (roll,conf)  => pub("POST","/attendance/mark-public",{rollNumber:roll,confidence:conf}),
  getStudent: (roll)      => pub("GET", "/attendance/student-public/"+roll),
  getGraph:   (roll)      => pub("GET", "/attendance/graph-public/"+roll),
};

export const Attendance = {
  getToday:   ()     => req("GET","/attendance/today"),
  getReport:  (p={}) => req("GET","/attendance/report?"+new URLSearchParams(p)),
};

export const Admin = {
  getDashboard: () => req("GET","/admin/dashboard"),
};