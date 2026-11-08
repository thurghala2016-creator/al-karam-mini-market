(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const cfg = window.ALKARAM_CONFIG || {};
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY &&
    !cfg.SUPABASE_URL.includes("PASTE_") && !cfg.SUPABASE_PUBLISHABLE_KEY.includes("PASTE_");
  let db = null, products = [], scanner = null, scanTarget = "lookup", lastUnknownBarcode = "", signedIn = false, liveChannel = null;
  const money = (n) => new Intl.NumberFormat("en-IE",{style:"currency",currency:"EUR"}).format(Number(n)||0);
  const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const setMessage = (id, msg, error=false) => { const el=$(id); el.textContent=msg; el.classList.toggle("error",!!error); };
  const showPage = (pageId) => {
    document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
    $(pageId).classList.remove("hidden");
    document.querySelectorAll(".nav-button").forEach(b=>b.classList.toggle("active",b.dataset.page===pageId));
    if(pageId==="productsPage") renderProducts();
    if(pageId==="overviewPage") renderOverview();
  };
  const setConnection = (msg, state="") => {
    const el=$("connectionBanner"); el.textContent=msg; el.className="connection-banner "+state;
  };
  function showResult(type, title, priceText="", stockText="") {
    const el=$("scanResult"); el.className="result-card "+type;
    el.innerHTML = `<div class="result-label">${type==="found"?"PRODUCT FOUND":type==="not-found"?"PRODUCT NOT FOUND":"READY"}</div>
      <div class="result-name">${escapeHtml(title)}</div>
      ${priceText?`<div class="result-price">${escapeHtml(priceText)}</div>`:""}
      ${stockText?`<div class="result-stock">${escapeHtml(stockText)}</div>`:""}`;
  }
  async function lookupBarcode(raw) {
    const barcode=String(raw||"").trim();
    if(!barcode){showResult("neutral","Enter or scan a barcode.");return;}
    $("manualBarcode").value=barcode;
    lastUnknownBarcode="";
    if(!db){showResult("not-found","Shop database is not connected.");return;}
    const {data,error}=await db.from("products").select("*").eq("barcode",barcode).maybeSingle();
    if(error){showResult("not-found","Could not check this barcode. Please try again.");return;}
    if(!data){
      lastUnknownBarcode=barcode;
      showResult("not-found","This product hasn't been added yet.");
      $("addUnknownBtn").classList.remove("hidden");
      return;
    }
    $("addUnknownBtn").classList.add("hidden");
    const stock=Number(data.stock);
    showResult("found",data.name,money(data.price),stock>0?`In stock: ${stock}`:"Out of stock");
  }
  async function startScanner(target="lookup") {
    if(!window.Html5Qrcode){alert("The scanner could not load. Please enter the barcode manually.");return;}
    scanTarget=target;
    $("scanPlaceholder").classList.add("hidden");
    $("reader").classList.remove("hidden");
    $("startScanBtn").classList.add("hidden");
    $("stopScanBtn").classList.remove("hidden");
    try{
      scanner = scanner || new Html5Qrcode("reader");
      const cameras=await Html5Qrcode.getCameras();
      if(!cameras || !cameras.length) throw new Error("No camera found.");
      const rear=cameras.find(c=>/back|rear|environment/i.test(c.label)) || cameras[cameras.length-1];
      await scanner.start(rear.id,{fps:10,qrbox:{width:260,height:150},aspectRatio:1.6},
        async(decoded)=>{
          await stopScanner();
          if(scanTarget==="add"){
            $("productBarcode").value=decoded;
            setMessage("formMessage","Barcode scanned. Add the product details.");
            showPage("addPage");
          } else { await lookupBarcode(decoded); }
        },()=>{});
    }catch(err){
      await stopScanner();
      showResult("not-found","Camera unavailable. Please enter the barcode manually.");
    }
  }
  async function stopScanner(){
    if(scanner){try{if(scanner.isScanning) await scanner.stop();}catch(e){}}
    $("reader").classList.add("hidden");
    $("reader").innerHTML="";
    $("scanPlaceholder").classList.remove("hidden");
    $("startScanBtn").classList.remove("hidden");
    $("stopScanBtn").classList.add("hidden");
    scanner=null;
  }
  async function refreshProducts(){
    const {data,error}=await db.from("products").select("*").order("name",{ascending:true});
    if(error){setConnection("Could not load inventory: "+error.message,"error");return;}
    products=data||[]; renderProducts(); renderOverview();
  }
  function renderProducts(){
    const q=$("productSearch").value.trim().toLowerCase();
    const found=products.filter(p=>p.name.toLowerCase().includes(q)||p.barcode.toLowerCase().includes(q));
    $("productList").innerHTML=found.length?found.map(p=>`
      <article class="product-row">
        <div class="product-info"><div class="product-title">${escapeHtml(p.name)}</div>
          <div class="product-meta">Barcode: ${escapeHtml(p.barcode)}<br>Stock: ${Number(p.stock)}</div>
          <div class="row-actions">
            <button class="small-button" data-edit="${escapeHtml(p.id)}" type="button">EDIT</button>
            <button class="small-button delete" data-delete="${escapeHtml(p.id)}" type="button">DELETE</button>
          </div>
        </div><div class="product-price">${money(p.price)}</div>
      </article>`).join(""):`<div class="empty-state">${products.length?"No matching products.":"No products added yet. Use ADD to register your first product."}</div>`;
  }
  function renderOverview(){
    const units=products.reduce((s,p)=>s+Number(p.stock),0);
    const value=products.reduce((s,p)=>s+Number(p.stock)*Number(p.price),0);
    $("totalProducts").textContent=products.length;
    $("totalUnits").textContent=units;
    $("stockValue").textContent=money(value);
    $("lowStock").textContent=products.filter(p=>Number(p.stock)<=5).length;
  }
  function resetProductForm(){
    $("productForm").reset();$("editingId").value="";$("formHeading").textContent="Add a product";
    $("cancelEditBtn").classList.add("hidden");setMessage("formMessage","");
  }
  function editProduct(id){
    const p=products.find(x=>String(x.id)===String(id));if(!p)return;
    $("editingId").value=p.id;$("productBarcode").value=p.barcode;$("productName").value=p.name;
    $("productPrice").value=p.price;$("productStock").value=p.stock;
    $("formHeading").textContent="Edit product";$("cancelEditBtn").classList.remove("hidden");
    showPage("addPage");window.scrollTo({top:0,behavior:"smooth"});
  }
  async function saveProduct(e){
    e.preventDefault();
    const id=$("editingId").value, barcode=$("productBarcode").value.trim(), name=$("productName").value.trim();
    const price=Number($("productPrice").value), stock=Number($("productStock").value);
    if(!barcode||!name||!Number.isFinite(price)||price<0||!Number.isInteger(stock)||stock<0){
      setMessage("formMessage","Please check the barcode, name, price and stock quantity.",true);return;
    }
    const duplicate=products.find(p=>p.barcode===barcode&&String(p.id)!==String(id));
    if(duplicate){
      const update=confirm(`This barcode already belongs to "${duplicate.name}". Update that product instead?`);
      if(!update)return;
      const {error}=await db.from("products").update({name,price,stock}).eq("id",duplicate.id);
      if(error){setMessage("formMessage",error.message,true);return;}
    }else{
      const payload={barcode,name,price,stock};
      const {error}=id?await db.from("products").update(payload).eq("id",id):await db.from("products").insert(payload);
      if(error){setMessage("formMessage",error.code==="23505"?"That barcode already exists. Refresh the product list and edit it.":error.message,true);return;}
    }
    setMessage("formMessage","Product saved.");
    resetProductForm();await refreshProducts();showPage("productsPage");
  }
  async function deleteProduct(id){
    const p=products.find(x=>String(x.id)===String(id));if(!p)return;
    if(!confirm(`Delete "${p.name}"? This cannot be undone.`))return;
    const {error}=await db.from("products").delete().eq("id",id);
    if(error){alert("Could not delete product: "+error.message);return;}
    await refreshProducts();
  }
  function exportBackup(){
    const blob=new Blob([JSON.stringify({shop:"AL-KARAM SHOP",version:1,exportedAt:new Date().toISOString(),products},null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`al-karam-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
    setMessage("backupMessage","Backup downloaded.");
  }
  async function importBackup(file){
    if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      if(!Array.isArray(parsed.products))throw new Error("This file is not an AL-KARAM inventory backup.");
      const rows=parsed.products.map(p=>{
        const barcode=String(p.barcode||"").trim(),name=String(p.name||"").trim(),price=Number(p.price),stock=Number(p.stock);
        if(!barcode||!name||!Number.isFinite(price)||price<0||!Number.isInteger(stock)||stock<0)throw new Error("A product in the backup has invalid details.");
        return {barcode,name,price,stock};
      });
      if(!confirm(`Restore ${rows.length} products? Matching barcodes will be updated. Other products will stay.`))return;
      for(let i=0;i<rows.length;i+=100){
        const {error}=await db.from("products").upsert(rows.slice(i,i+100),{onConflict:"barcode"});
        if(error)throw error;
      }
      await refreshProducts();setMessage("backupMessage",`Restored ${rows.length} products.`);
    }catch(err){setMessage("backupMessage","Restore failed: "+err.message,true);}
    $("importFile").value="";
  }
  function wire(){
    $("loginForm").addEventListener("submit",async e=>{
      e.preventDefault();setMessage("loginMessage","Signing in…");
      const {error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
      if(error)setMessage("loginMessage",error.message,true);
    });
    $("signOutBtn").addEventListener("click",async()=>{await db.auth.signOut();});
    $("startScanBtn").addEventListener("click",()=>startScanner("lookup"));
    $("stopScanBtn").addEventListener("click",stopScanner);
    $("scanForAddBtn").addEventListener("click",()=>startScanner("add"));
    $("manualBarcodeForm").addEventListener("submit",e=>{e.preventDefault();lookupBarcode($("manualBarcode").value);});
    $("addUnknownBtn").addEventListener("click",()=>{resetProductForm();$("productBarcode").value=lastUnknownBarcode;showPage("addPage");});
    $("productForm").addEventListener("submit",saveProduct);
    $("cancelEditBtn").addEventListener("click",resetProductForm);
    $("productSearch").addEventListener("input",renderProducts);
    $("productList").addEventListener("click",e=>{
      const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");
      if(edit)editProduct(edit.dataset.edit);if(del)deleteProduct(del.dataset.delete);
    });
    document.querySelectorAll(".nav-button").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.page==="addPage")resetProductForm();showPage(b.dataset.page);}));
    $("exportBtn").addEventListener("click",exportBackup);
    $("importFile").addEventListener("change",e=>importBackup(e.target.files[0]));
  }
  function showSignedIn(){
    if(signedIn)return;
    signedIn=true;
    $("loginScreen").classList.add("hidden");$("appScreen").classList.remove("hidden");$("signOutBtn").classList.remove("hidden");
    setConnection("Loading shared shop inventory…");
    refreshProducts().then(()=>setConnection("Connected • Shared inventory is up to date","online"));
    liveChannel=db.channel("inventory-live").on("postgres_changes",{event:"*",schema:"public",table:"products"},async()=>{await refreshProducts();}).subscribe((status)=>{
      if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")setConnection("Live updates paused. Refresh the page if changes do not appear.","error");
    });
    showPage("scanPage");
  }
  function showSignedOut(){
    signedIn=false;
    if(liveChannel){db.removeChannel(liveChannel);liveChannel=null;}
    $("appScreen").classList.add("hidden");$("loginScreen").classList.remove("hidden");$("signOutBtn").classList.add("hidden");
    if(scanner)stopScanner();
  }
  if(!configured){
    $("loginMessage").textContent="Setup needed: add your Supabase URL and publishable key in config.js.";
    $("loginMessage").classList.add("error");
  }else if(!window.supabase){
    $("loginMessage").textContent="The database library did not load. Check your internet connection.";
    $("loginMessage").classList.add("error");
  }else{
    db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
    wire();
    db.auth.getSession().then(({data})=>data.session?showSignedIn():showSignedOut());
    db.auth.onAuthStateChange((event,session)=>{if(session)showSignedIn();else showSignedOut();});
  }
})();