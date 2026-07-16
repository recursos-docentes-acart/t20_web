const {ranges,targets,validation}=window.G10_DATA;
validation.readingTolerance=.5;

const panoramaImage=document.getElementById("panoramaImage");
const panoramaWrap=document.getElementById("panoramaWrap");
const aimMarker=document.getElementById("aimMarker");
const scopeCanvas=document.getElementById("scopeCanvas");
const scopeCtx=scopeCanvas.getContext("2d");
scopeCtx.imageSmoothingEnabled = false; // crisper rendering

const readingScope=document.getElementById("readingScope");
const directionRange=document.getElementById("directionRange");
const elevationRange=document.getElementById("elevationRange");

const state={direction:3100,elevation:2700,dragging:false};

function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function roundToHalf(v){return Math.round(v*2)/2;}
function parseReading(input){
  const raw=input.value.trim().replace(",",".");
  if(raw==="") return NaN;
  const value=Number(raw);
  return Number.isFinite(value) ? value : NaN;
}
function getMicroscopeReading(value){
  const normalizedValue=((value%6400)+6400)%6400;
  const mainNumber=Math.floor(normalizedValue/10);
  const scalePosition=normalizedValue-mainNumber*10;
  return {
    mainNumber,
    scalePosition,
    formatted:normalizedValue.toFixed(Number.isInteger(normalizedValue)?0:1)
  };
}
function normalized(){
  return {
    x:(state.direction-ranges.directionMin)/(ranges.directionMax-ranges.directionMin),
    y:(ranges.elevationMax-state.elevation)/(ranges.elevationMax-ranges.elevationMin)
  };
}
function updateFromReadings(){
  state.direction=Number(directionRange.value);
  state.elevation=Number(elevationRange.value);
  render();
}
function updateFromPoint(clientX,clientY){
  const rect=panoramaWrap.getBoundingClientRect();
  const x=clamp((clientX-rect.left)/rect.width,0,1);
  const y=clamp((clientY-rect.top)/rect.height,0,1);
  state.direction=roundToHalf(ranges.directionMin+x*(ranges.directionMax-ranges.directionMin));
  state.elevation=roundToHalf(ranges.elevationMax-y*(ranges.elevationMax-ranges.elevationMin));
  directionRange.value=state.direction;
  elevationRange.value=state.elevation;
  render();
}
function drawScope(){
  if(!panoramaImage.complete)return;
  const p=normalized();
  const imageW=panoramaImage.naturalWidth;
  const imageH=panoramaImage.naturalHeight;
  const cropW=imageW*ranges.fieldOfView/(ranges.directionMax-ranges.directionMin);
  const cropH=imageH*ranges.fieldOfView/(ranges.elevationMax-ranges.elevationMin);
  let sx=p.x*imageW-cropW/2;
  let sy=p.y*imageH-cropH/2;
  sx=clamp(sx,0,imageW-cropW);
  sy=clamp(sy,0,imageH-cropH);

  const temp=document.createElement("canvas");
  temp.width=620; temp.height=620;
  const tctx=temp.getContext("2d");
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(panoramaImage,sx,sy,cropW,cropH,0,0,620,620);

  scopeCtx.clearRect(0,0,620,620);
  scopeCtx.save();
  scopeCtx.beginPath();
  scopeCtx.arc(310,310,310,0,Math.PI*2);
  scopeCtx.clip();
  scopeCtx.drawImage(temp,0,0);

  const vignette=scopeCtx.createRadialGradient(310,310,220,310,310,310);
  vignette.addColorStop(0,"rgba(0,0,0,0)");
  vignette.addColorStop(1,"rgba(0,0,0,.24)");
  scopeCtx.fillStyle=vignette;
  scopeCtx.fillRect(0,0,620,620);
  scopeCtx.restore();
}
function drawReadingBand(ctx,y,value,label,background,orientation){
  const x=54,w=452,bodyH=184,tabW=116,tabH=60;
  const bodyY=orientation==="top"?y+tabH:y;
  const reading=getMicroscopeReading(value);
  const scaleStartX=x+54,scaleEndX=x+w-54;
  const scaleWidth=scaleEndX-scaleStartX;
  const indicatorX=scaleStartX+(reading.scalePosition/10)*scaleWidth;

  // Ventana en T: pestaña superior para V e inferior para Hz.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x,bodyY,w,bodyH);
  ctx.rect(x+w/2-tabW/2,orientation==="top"?y:bodyY+bodyH-2,tabW,tabH+2);
  ctx.clip();
  const glass=ctx.createLinearGradient(x,bodyY,x+w,bodyY+bodyH);
  glass.addColorStop(0,background);
  glass.addColorStop(.52,orientation==="top"?"#cdf4f0":"#f5db38");
  glass.addColorStop(1,orientation==="top"?"#9ed8da":"#dfbd1d");
  ctx.fillStyle=glass;
  ctx.fillRect(x,y,w,bodyH+tabH);
  ctx.restore();

  ctx.save();
  ctx.beginPath(); ctx.rect(x+2,bodyY+2,w-4,bodyH-4); ctx.clip();
  ctx.fillStyle="rgba(20,48,61,.8)";
  ctx.strokeStyle="rgba(20,48,61,.76)";
  ctx.textAlign="center";

  const scaleTop=orientation==="top"?bodyY+94:bodyY+18;
  const numberY=orientation==="top"?bodyY+57:bodyY+155;
  const labelY=scaleTop+67;

  // Cinta continua: al cambiar de decena, el número siguiente entra sin salto visual.
  ctx.font="42px 'Arial Narrow', Arial, sans-serif";
  [[reading.mainNumber+1,indicatorX-scaleWidth],
   [reading.mainNumber,indicatorX],
   [reading.mainNumber-1,indicatorX+scaleWidth]]
    .forEach(([number,tx])=>ctx.fillText(String((number+640)%640).padStart(3,"0"),tx,numberY));

  ctx.lineWidth=2.2;
  ctx.beginPath();
  if(orientation==="top"){
    ctx.moveTo(indicatorX,numberY+12); ctx.lineTo(indicatorX,scaleTop+40);
  }else{
    ctx.moveTo(indicatorX,scaleTop-5); ctx.lineTo(indicatorX,numberY-20);
  }
  ctx.stroke();

  // Escala 0–10, con una marca corta en cada media milésima.
  for(let i=0;i<=20;i++){
    const tx=scaleStartX+(i/20)*scaleWidth;
    const integerMark=i%2===0;
    ctx.lineWidth=integerMark?1.6:.9;
    ctx.beginPath();
    ctx.moveTo(tx,scaleTop);
    ctx.lineTo(tx,scaleTop+(integerMark?38:25));
    ctx.stroke();
    if(integerMark){
      ctx.font="17px 'Arial Narrow', Arial, sans-serif";
      ctx.fillText(String(i/2),tx,labelY);
    }
  }
  ctx.restore();

  ctx.fillStyle="rgba(20,48,61,.8)";
  ctx.textAlign="center";
  ctx.font="38px 'Arial Narrow', Arial, sans-serif";
  ctx.fillText(label,x+w/2,orientation==="top"?y+45:bodyY+bodyH+48);
}
function drawReadingScope(){
  const ctx=readingScope.getContext("2d");
  ctx.clearRect(0,0,readingScope.width,readingScope.height);
  const opticalField=ctx.createRadialGradient(280,300,35,280,300,390);
  opticalField.addColorStop(0,"#354a63");
  opticalField.addColorStop(.72,"#24364d");
  opticalField.addColorStop(1,"#101b2a");
  ctx.fillStyle=opticalField;
  ctx.fillRect(0,0,readingScope.width,readingScope.height);
  drawReadingBand(ctx,38,state.elevation,"V","#b8edf0","top");
  drawReadingBand(ctx,330,state.direction,"Hz","#f3d42f","bottom");

  const vignette=ctx.createRadialGradient(280,300,210,280,300,390);
  vignette.addColorStop(0,"rgba(0,0,0,0)");
  vignette.addColorStop(1,"rgba(0,0,0,.38)");
  ctx.fillStyle=vignette;
  ctx.fillRect(0,0,readingScope.width,readingScope.height);
}
function buildReticle(){
  const v=document.getElementById("verticalTicks");
  const h=document.getElementById("horizontalTicks");
  const gap=22,spacing=29;
  v.insertAdjacentHTML("beforeend",`<line x1="310" y1="24" x2="310" y2="${310-gap}"/><line x1="310" y1="${310+gap}" x2="310" y2="596"/>`);
  h.insertAdjacentHTML("beforeend",`<line x1="24" y1="310" x2="${310-gap}" y2="310"/><line x1="${310+gap}" y1="310" x2="596" y2="310"/>`);
  for(let i=-9;i<=9;i++){
    if(i===0) continue;
    const pos=310+i*spacing;
    const major=i%2===0,len=major?20:11,label=Math.abs(i)*5;
    v.insertAdjacentHTML("beforeend",`<line x1="${310-len/2}" y1="${pos}" x2="${310+len/2}" y2="${pos}"/>${major?`<text x="${i<0?322:276}" y="${pos+6}">${label}</text>`:""}`);
    h.insertAdjacentHTML("beforeend",`<line x1="${pos}" y1="${310-len/2}" x2="${pos}" y2="${310+len/2}"/>${major?`<text x="${pos-8}" y="${i<0?338:298}">${label}</text>`:""}`);
  }
}
function buildRulers(){
  const horizontal=document.getElementById("horizontalRuler");
  const vertical=document.getElementById("verticalRuler");
  for(let value=ranges.directionMin; value<=ranges.directionMax; value+=100){
    const pct=(value-ranges.directionMin)/(ranges.directionMax-ranges.directionMin)*100;
    const tick=document.createElement("span");
    tick.className="ruler-tick"; tick.style.left=`${pct}%`; tick.style.height=value%400===0||value===ranges.directionMax?"17px":"9px";
    horizontal.appendChild(tick);
    if(value%400===0 || value===ranges.directionMax){
      const label=document.createElement("span");
      label.className="ruler-label"; label.style.left=`${pct}%`; label.textContent=value;
      horizontal.appendChild(label);
    }
  }
  for(let value=ranges.elevationMax; value>=ranges.elevationMin; value-=100){
    const pct=(ranges.elevationMax-value)/(ranges.elevationMax-ranges.elevationMin)*100;
    const tick=document.createElement("span");
    tick.className="ruler-tick"; tick.style.top=`${pct}%`; tick.style.width=value%200===0?"16px":"9px";
    vertical.appendChild(tick);
    if(value%200===0){
      const label=document.createElement("span");
      label.className="ruler-label"; label.style.top=`${pct}%`; label.textContent=value;
      vertical.appendChild(label);
    }
  }
}
panoramaWrap.addEventListener("pointerdown",event=>{state.dragging=true; panoramaWrap.setPointerCapture(event.pointerId); updateFromPoint(event.clientX,event.clientY);});
panoramaWrap.addEventListener("pointermove",event=>{if(state.dragging) updateFromPoint(event.clientX,event.clientY);});
panoramaWrap.addEventListener("pointerup",()=>state.dragging=false);
panoramaWrap.addEventListener("pointercancel",()=>state.dragging=false);
directionRange.addEventListener("input",updateFromReadings);
elevationRange.addEventListener("input",updateFromReadings);
document.querySelectorAll("[data-axis]").forEach(button=>{
  button.addEventListener("click",()=>{
    const axis=button.dataset.axis, step=Number(button.dataset.step);
    if(axis==="x") directionRange.value=clamp(Number(directionRange.value)+step,ranges.directionMin,ranges.directionMax);
    else elevationRange.value=clamp(Number(elevationRange.value)+step,ranges.elevationMin,ranges.elevationMax);
    updateFromReadings();
  });
});
document.getElementById("resetButton").addEventListener("click",()=>{directionRange.value=3100; elevationRange.value=2700; updateFromReadings();});

const query=new URLSearchParams(location.search);
const exerciseId=Number(query.get("exercise"));
const activeTarget=targets.find(t=>t.id===exerciseId);
if(activeTarget){
  document.getElementById("exerciseBanner").classList.remove("hidden");
  document.getElementById("exerciseName").textContent=`${activeTarget.id}. ${activeTarget.name}`;
  document.getElementById("exerciseDescription").textContent=activeTarget.description;
  directionRange.value=clamp(activeTarget.direction+120,ranges.directionMin,ranges.directionMax);
  elevationRange.value=clamp(activeTarget.elevation-80,ranges.elevationMin,ranges.elevationMax);
  updateFromReadings();
  document.getElementById("answerForm").addEventListener("submit",event=>{
    event.preventDefault();
    const answerH=parseReading(document.getElementById("answerH"));
    const answerV=parseReading(document.getElementById("answerV"));
    const feedback=document.getElementById("exerciseFeedback");
    if(!Number.isFinite(answerH) || !Number.isFinite(answerV)){
      feedback.className="feedback error"; feedback.textContent="Escriba una lectura Hz y una lectura V antes de comprobar."; return;
    }
    const aimH=Math.abs(state.direction-activeTarget.direction);
    const aimV=Math.abs(state.elevation-activeTarget.elevation);
    const readH=Math.abs(answerH-state.direction);
    const readV=Math.abs(answerV-state.elevation);
    const aimOK=(aimH<=validation.aimTolerance)&&(aimV<=validation.aimTolerance);
    const readHOK=readH<=validation.readingTolerance;
    const readVOK=readV<=validation.readingTolerance;
    if(aimOK && readHOK && readVOK){
      feedback.className="feedback success";
      feedback.textContent="Ejercicio correcto: puntería válida y lecturas Hz y V correctas dentro de la tolerancia.";
      return;
    }
    const messages=[];
    if(!aimOK){
      const dirMsg=aimH<=validation.aimTolerance ? "dirección correcta" : (state.direction<activeTarget.direction ? "mueva la visual hacia la derecha" : "mueva la visual hacia la izquierda");
      const elevMsg=aimV<=validation.aimTolerance ? "elevación correcta" : (state.elevation<activeTarget.elevation ? "eleve la visual" : "baje la visual");
      messages.push(`Puntería: ${dirMsg}; ${elevMsg}.`);
    } else messages.push("Puntería correcta.");
    if(!readHOK || !readVOK){
      const rm=[]; if(!readHOK) rm.push("revise la lectura Hz"); if(!readVOK) rm.push("revise la lectura V");
      messages.push(`Lecturas: ${rm.join(" y ")}.`);
    } else messages.push("Lecturas correctas.");
    feedback.className="feedback error"; feedback.textContent=messages.join(" ");
  });
}

panoramaImage.addEventListener("load",render);
window.addEventListener("resize",render);
function render(){
  const p=normalized();
  aimMarker.style.left=`${p.x*100}%`;
  aimMarker.style.top=`${p.y*100}%`;
  drawScope();
  drawReadingScope();
}
buildReticle(); buildRulers(); updateFromReadings();
