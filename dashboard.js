document.addEventListener('DOMContentLoaded',()=>{
const $=id=>document.getElementById(id);
const getL=k=>new Promise(r=>chrome.storage.local.get(k,r));
const setL=o=>new Promise(r=>chrome.storage.local.set(o,r));
const getS=k=>new Promise(r=>chrome.storage.sync.get(k,r));
const setS=o=>new Promise(r=>chrome.storage.sync.set(o,r));
const msg=(a,d={})=>new Promise(r=>chrome.runtime.sendMessage({action:a,...d},r));

// ===== CLOCK =====
const updateClock=()=>{
const n=new Date();
$('clock').textContent=n.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:true});
$('date-display').textContent=n.toLocaleDateString([],{weekday:'long',year:'numeric',month:'long',day:'numeric'});
};
updateClock();setInterval(updateClock,1000);

// ===== GREETING =====
const h=new Date().getHours();
$('greeting').textContent=h<12?'Good morning':h<18?'Good afternoon':'Good evening';

// ===== SEARCH =====
getS(['searchEngine']).then(d=>{
$('search-form').dataset.se=d.searchEngine||'https://www.google.com/search?q=';
});
$('search-form').addEventListener('submit',e=>{
e.preventDefault();
const q=$('search-input').value.trim();
if(q)window.location.href=`${$('search-form').dataset.se}${encodeURIComponent(q)}`;
});

// ===== WEATHER =====
const getMeteocon=(code,isDay)=>{
const base='https://cdn.jsdelivr.net/npm/@bybas/weather-icons@latest/production/fill/all/';
if(code<=1)return base+(isDay?'clear-day.svg':'clear-night.svg');
if(code===2)return base+(isDay?'partly-cloudy-day.svg':'partly-cloudy-night.svg');
if(code===3)return base+'overcast.svg';
if(code<=48)return base+'fog.svg';
if(code<=55)return base+'drizzle.svg';
if(code<=63)return base+'rain.svg';
if(code<=67)return base+'extreme-rain.svg';
if(code<=77)return base+'snow.svg';
if(code<=82)return base+'rain.svg';
return base+'thunderstorms.svg';
};
const WMO_Q={0:'clear sky',1:'mostly clear sky',2:'partly cloudy sky',3:'overcast sky',45:'foggy landscape',48:'rime fog landscape',51:'light drizzle',53:'drizzle landscape',55:'dense drizzle landscape',61:'light rain',63:'moderate rain landscape',65:'heavy rain landscape',71:'light snow',73:'snow landscape',75:'heavy snow landscape',80:'rain showers landscape',81:'heavy rain showers',95:'thunderstorm landscape',96:'hail storm',99:'severe storm'};
const WMO_L={0:'Clear sky',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',48:'Rime fog',51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',61:'Light rain',63:'Moderate rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Showers',81:'Rain showers',95:'Thunderstorm',96:'Hail storm',99:'Severe storm'};

const getWeatherBgClass=(code,isDay)=>{
if(code<=1)return isDay?'weather-bg-clear-day':'weather-bg-clear-night';
if(code<=3)return isDay?'weather-bg-cloudy-day':'weather-bg-cloudy-night';
if(code<=48)return isDay?'weather-bg-cloudy-day':'weather-bg-cloudy-night';
if(code<=67)return isDay?'weather-bg-rain-day':'weather-bg-rain-night';
if(code<=77)return isDay?'weather-bg-snow-day':'weather-bg-snow-night';
if(code<=82)return isDay?'weather-bg-rain-day':'weather-bg-rain-night';
return isDay?'weather-bg-rain-day':'weather-bg-rain-night';
};

const determineExactCondition = (code, tempC, windKmh, isDay) => {
    if (window._testWeatherCondition) return window._testWeatherCondition;

    if (windKmh > 118 && code >= 95) return 'Tornado';
    if (windKmh > 118 && code >= 50) return 'Hurricane';
    if (windKmh > 80 && code >= 50) return 'Tropical Storm';
    if (windKmh > 60 && code >= 71 && code <= 77) return 'Blowing Snow';
    if (windKmh > 60 && code < 10) return 'Sandstorm';
    if (windKmh > 40 && code < 10) return 'Dust';
    
    if (tempC > 35 && code <= 3) return 'Hot';
    if (tempC < -10 && code <= 3) return 'Frigid';
    
    if (windKmh > 40 && code <= 3) return 'Windy';
    if (windKmh > 20 && code <= 3) return 'Breezy';

    if (code >= 51 && code <= 67 && tempC <= 2 && tempC >= -2) return 'Wintry Mix';

    switch(code) {
        case 0: return 'Clear';
        case 1: return 'Mostly Clear';
        case 2: return 'Partly Cloudy';
        case 3: return 'Cloudy'; // Or Mostly Cloudy
        case 45: return 'Fog';
        case 48: return 'Haze';
        case 51: return 'Drizzle';
        case 53: return 'Rain';
        case 55: return 'Heavy Rain';
        case 56: return 'Freezing Drizzle';
        case 57: return 'Freezing Rain';
        case 61: return isDay ? 'Sun Showers' : 'Rain';
        case 63: return 'Rain';
        case 65: return 'Heavy Rain';
        case 66: return 'Freezing Rain';
        case 67: return 'Freezing Rain';
        case 71: return 'Flurries';
        case 73: return 'Snow';
        case 75: return 'Heavy Snow';
        case 77: return 'Sleet';
        case 80: return 'Sun Showers'; 
        case 81: return 'Rain';
        case 82: return 'Heavy Rain';
        case 85: return 'Scattered Snow';
        case 86: return 'Heavy Snow';
        case 95: return 'Isolated Thunderstorms';
        case 96: return 'Hail';
        case 99: return 'Thunderstorms';
    }
    return 'Clear';
};

window.testWeatherCondition = (name) => {
    window._testWeatherCondition = name;
    loadWeather(); // Re-trigger weather render
};

const generateWeatherAnimations=(condition, isDay)=>{
    let html = '';
    const container = '<div class="weather-stars">'; // Using the same container class for isolation
    
    const isNight = !isDay;
    
    // Base Stars for Night (if not completely overcast)
    const overcastConditions = ['Cloudy', 'Mostly Cloudy', 'Fog', 'Haze', 'Smoke', 'Dust', 'Sandstorm', 'Hurricane', 'Tornado'];
    if (isNight && !overcastConditions.includes(condition)) {
        for(let i=0;i<12;i++){
            const x=Math.random()*100,y=Math.random()*60,d=Math.random()*3+1,s=Math.random()*1.5+0.5;
            html+=`<div class="weather-star" style="left:${x}%;top:${y}%;animation-delay:${d}s;width:${s}px;height:${s}px"></div>`;
        }
    }

    if (['Clear', 'Mostly Clear'].includes(condition) && isNight) {
        html+=`<div class="weather-shooting-star" style="left:80%;top:10%;animation-delay:2s"></div>`;
        if(Math.random()>0.5) html+=`<div class="weather-shooting-star" style="left:60%;top:20%;animation-delay:5s"></div>`;
    }

    if (['Partly Cloudy', 'Mostly Cloudy', 'Cloudy', 'Scattered Thunderstorms', 'Isolated Thunderstorms', 'Haze', 'Smoke'].includes(condition)) {
        const cloudCount = condition === 'Cloudy' ? 6 : (condition === 'Partly Cloudy' ? 3 : 4);
        const color = condition === 'Smoke' ? 'rgba(100,90,80,0.3)' : (condition === 'Haze' ? 'rgba(200,200,180,0.15)' : 'rgba(255,255,255,0.12)');
        for(let i=0;i<cloudCount;i++){
            const w=Math.random()*100+80, h=Math.random()*40+30;
            const y=Math.random()*50, d=Math.random()*20;
            html+=`<div class="weather-cloud" style="width:${w}px;height:${h}px;top:${y}%;left:${i*20}%;animation-delay:-${d}s;background:${color}"></div>`;
        }
    }

    if (['Drizzle', 'Rain', 'Heavy Rain', 'Sun Showers', 'Tropical Storm', 'Hurricane', 'Tornado', 'Wintry Mix', 'Freezing Rain', 'Freezing Drizzle'].includes(condition)) {
        let drops = 15;
        if (['Heavy Rain', 'Hurricane', 'Tornado', 'Tropical Storm'].includes(condition)) drops = 35;
        if (['Drizzle', 'Freezing Drizzle', 'Sun Showers', 'Wintry Mix'].includes(condition)) drops = 8;
        
        const slant = ['Hurricane', 'Tornado', 'Tropical Storm', 'Windy'].includes(condition) ? 35 : 15;
        const color = condition.includes('Freezing') ? 'rgba(150,200,255,0.6)' : 'rgba(255,255,255,0.4)';

        for(let i=0;i<drops;i++){
            const x=Math.random()*120 - 10, d=Math.random()*1.5;
            html+=`<div class="weather-raindrop" style="left:${x}%;animation-delay:${d}s;transform:rotate(${slant}deg);background:linear-gradient(to bottom, rgba(255,255,255,0), ${color})"></div>`;
        }
    }

    if (condition === 'Sun Showers' && isDay) {
        html+=`<div class="weather-sun-ray" style="left:20%;top:-20%"></div>`;
        html+=`<div class="weather-sun-ray" style="left:50%;top:-10%;animation-delay:2s"></div>`;
    }

    if (['Snow', 'Heavy Snow', 'Scattered Snow', 'Flurries', 'Blowing Snow', 'Wintry Mix'].includes(condition)) {
        let flakes = 20;
        if (condition === 'Heavy Snow' || condition === 'Blowing Snow') flakes = 40;
        if (condition === 'Flurries' || condition === 'Scattered Snow' || condition === 'Wintry Mix') flakes = 10;
        
        for(let i=0;i<flakes;i++){
            const x=Math.random()*100, d=Math.random()*4, s=Math.random()*3+2;
            const cls = condition === 'Blowing Snow' ? 'weather-blowing-snow' : 'weather-snowflake';
            html+=`<div class="${cls}" style="left:${x}%;width:${s}px;height:${s}px;animation-delay:${d}s, ${d}s"></div>`;
        }
    }

    if (['Sleet', 'Hail'].includes(condition)) {
        const count = condition === 'Hail' ? 25 : 15;
        const sizeBase = condition === 'Hail' ? 4 : 2;
        for(let i=0;i<count;i++){
            const x=Math.random()*100, d=Math.random()*1.5, s=Math.random()*2+sizeBase;
            html+=`<div class="weather-hail" style="left:${x}%;width:${s}px;height:${s}px;animation-delay:${d}s"></div>`;
        }
    }

    if (['Thunderstorms', 'Isolated Thunderstorms', 'Scattered Thunderstorms', 'Tornado', 'Hurricane'].includes(condition)) {
        const flashes = condition === 'Thunderstorms' || condition === 'Tornado' ? 2 : 1;
        for(let i=0;i<flashes;i++){
            const d = Math.random()*8+2;
            html+=`<div class="weather-lightning" style="animation-delay:${d}s"></div>`;
        }
    }

    if (['Windy', 'Breezy', 'Hurricane', 'Tornado', 'Tropical Storm'].includes(condition)) {
        const lines = ['Hurricane', 'Tornado'].includes(condition) ? 15 : (condition === 'Windy' ? 8 : 4);
        for(let i=0;i<lines;i++){
            const y=Math.random()*100, d=Math.random()*2;
            html+=`<div class="weather-wind-line" style="top:${y}%;animation-delay:${d}s"></div>`;
        }
    }

    if (['Dust', 'Sandstorm'].includes(condition)) {
        const count = condition === 'Sandstorm' ? 50 : 20;
        for(let i=0;i<count;i++){
            const y=Math.random()*100, d=Math.random()*3, s=Math.random()*2+1;
            html+=`<div class="weather-sand" style="top:${y}%;width:${s}px;height:${s}px;animation-delay:${d}s"></div>`;
        }
    }

    if (condition === 'Tornado') {
        html+=`<div class="weather-tornado"></div><div class="weather-tornado" style="animation-delay:-0.5s;width:60px;bottom:10px"></div>`;
    }

    if (condition === 'Hot') {
        html+=`<div class="weather-heatwave"></div>`;
    }

    if (condition === 'Frigid') {
        html+=`<div class="weather-frost"></div>`;
    }

    return html ? container + html + '</div>' : '';
};

const renderWeather=(data,city,unit)=>{
const c=data.current,code=c.weather_code,isDay=c.is_day;
let temp=c.temperature_2m,fl=c.apparent_temperature,uL='°';
const wind=c.wind_speed_10m||0;
if(unit==='F'){temp=temp*9/5+32;fl=fl*9/5+32;}
const bgCls=getWeatherBgClass(code,isDay);
const hiTemp=Math.round(temp+4),loTemp=Math.round(temp-4);

const exactCondition = determineExactCondition(code, c.temperature_2m, wind, isDay);
const animationsHTML = generateWeatherAnimations(exactCondition, isDay);

const blockEl = document.querySelector('.block[data-block-id="weather"]');
if(blockEl) blockEl.className = 'block weather-block-active ' + bgCls;
$('weather-content').innerHTML=`
<div class="weather-block-inner">
<div class="weather-bg">
${animationsHTML}
</div>
<div class="weather-top">
<div class="weather-city-name">${city}</div>
<img src="${getMeteocon(code,isDay)}" class="weather-condition-icon" alt="Weather icon">
</div>
<div class="weather-bottom">
<div class="weather-temp-large">${Math.round(temp)}<span class="weather-deg">${uL}</span></div>
<div class="weather-right-info">
<div class="weather-condition-text">${exactCondition}</div>
<div class="weather-hilo">H ${hiTemp}°  L ${loTemp}°</div>
</div>
</div>
</div>
</div>`;
loadWallpaper(code, isDay);
};

// ===== WALLPAPER =====
const loadWallpaper=async(weatherCode,isDay)=>{
const CK='wallpaperCache',TTL=60*60*1000;
const st=await getL([CK]);const ca=st[CK];
if(ca&&(Date.now()-ca.ts)<TTL&&ca.url){
    if(ca.url.includes('unsplash.com')) await setL({[CK]:null});
    else {applyWallpaper(ca.url);return;}
}
let q=WMO_Q[weatherCode]||WMO_Q[0];
q += isDay ? ' day' : ' night';
try{
const r=await msg('FETCH_WALLPAPER',{query:q});
if(r?.success&&r.imageUrl){
await setL({[CK]:{url:r.imageUrl,ts:Date.now()}});
applyWallpaper(r.imageUrl);
}
}catch(e){console.warn('Wallpaper fetch failed',e);}
};
const applyWallpaper=url=>{
const img=new Image();
img.onload=()=>{
const s=document.body.style;
s.backgroundImage=`linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.55)),url(${url})`;
s.backgroundSize='cover';s.backgroundPosition='center';
setL({cachedWeatherBg:null});
};
img.src=url;
};

const loadWeather=async()=>{
const CK='weatherCache',TTL=30*60*1000;
const s=await getS(['tempUnit']);const unit=s.tempUnit||'C';
const st=await getL([CK]);const ca=st[CK];
if(ca&&(Date.now()-ca.ts)<TTL){renderWeather(ca.data,ca.city,unit);return;}
const getCoords=()=>new Promise(res=>{
if(!navigator.geolocation){fallbackIP(res);return;}
navigator.geolocation.getCurrentPosition(
p=>res({lat:p.coords.latitude,lon:p.coords.longitude,method:'gps'}),
()=>fallbackIP(res),{timeout:6000});
});
const fallbackIP=async(res)=>{
const r=await msg('FETCH_IP_LOCATION');
if(r&&r.success)res({lat:r.data.lat,lon:r.data.lon,city:r.data.city,method:'ip'});
else res(null);
};
const coords=await getCoords();
if(!coords){$('weather-content').innerHTML='<div class="weather-error">Location unavailable</div>';return;}
try{
const [wr,gr]=await Promise.all([
msg('FETCH_WEATHER',{latitude:coords.lat,longitude:coords.lon}),
coords.city?Promise.resolve({success:true,city:coords.city}):msg('REVERSE_GEOCODE',{latitude:coords.lat,longitude:coords.lon})
]);
if(!wr?.success)throw new Error(wr?.error||'fail');
const city=gr?.success?gr.city:'Unknown';
await setL({[CK]:{data:wr.data,city,ts:Date.now()}});
renderWeather(wr.data,city,unit);
}catch(e){$('weather-content').innerHTML=`<div class="weather-error">⚠️ ${e.message}</div>`;}
};

// ===== DAILY FACT =====
const loadFact=async()=>{
try{
const r=await msg('FETCH_DAILY_FACT');
if(r?.success)$('fact-text').textContent=r.fact;
else throw new Error();
}catch(e){$('fact-text').textContent='Every day is a new opportunity to learn something!';}
};



// ===== STORIES (infinite horizontal scroll, multiple feeds) =====
let allStoryItems=[];
let storiesRendered=0;
const STORIES_BATCH=10;
let storiesLoading=false;
let storiesExhausted=false;

const renderStoryCards=(startIdx,count)=>{
const container=$('stories-scroll');
const end=Math.min(startIdx+count,allStoryItems.length);
for(let i=startIdx;i<end;i++){
const it=allStoryItems[i];
const a=document.createElement('a');
a.href=it.link;a.className='bottom-story-card';a.target='_blank';
a.innerHTML=`<span class="story-source">${it.source}</span><span class="story-title">${it.title}</span>`;
container.appendChild(a);
}
storiesRendered=end;
if(storiesRendered>=allStoryItems.length)storiesExhausted=true;
};

const loadMoreStories=()=>{
if(storiesLoading||storiesExhausted)return;
storiesLoading=true;
renderStoryCards(storiesRendered,STORIES_BATCH);
storiesLoading=false;
};

// Attach infinite scroll listener
$('stories-scroll').addEventListener('scroll',()=>{
const el=$('stories-scroll');
if(el.scrollLeft+el.clientWidth>=el.scrollWidth-300){
loadMoreStories();
}
});

$('stories-scroll-left').addEventListener('click', () => {
    $('stories-scroll').scrollBy({ left: -600, behavior: 'smooth' });
});
$('stories-scroll-right').addEventListener('click', () => {
    $('stories-scroll').scrollBy({ left: 600, behavior: 'smooth' });
});

const loadInternetStories=async(feeds)=>{
const feedList=(feeds&&feeds.length)?feeds:[{name:'BBC News',url:'https://feeds.bbci.co.uk/news/rss.xml'}];
try{
const results=await Promise.all(feedList.map(f=>msg('FETCH_STORIES',{url:f.url}).then(r=>{
if(!r?.success)return[];
const doc=new DOMParser().parseFromString(r.data,'text/xml');
const sourceName=doc.querySelector('channel > title')?.textContent||f.name||'NEWS';
return Array.from(doc.querySelectorAll('item')).slice(0,20).map(it=>({
title:it.querySelector('title')?.textContent||'',
link:it.querySelector('link')?.textContent||'#',
source:sourceName
}));
}).catch(()=>[])));
allStoryItems=results.flat().sort(()=>0.5-Math.random());
storiesRendered=0;
storiesExhausted=false;
$('stories-scroll').innerHTML='';
if(!allStoryItems.length){$('stories-scroll').innerHTML='<p class="placeholder">No stories available. Add feeds in Settings.</p>';return;}
renderStoryCards(0,STORIES_BATCH);
}catch(e){$('stories-scroll').innerHTML='<p class="placeholder">Failed to load stories</p>';}
};


// ===== SHORTCUTS =====
const DEF_SC=[
{title:'YouTube',url:'https://youtube.com'},{title:'Gmail',url:'https://mail.google.com'},
{title:'GitHub',url:'https://github.com'},{title:'Reddit',url:'https://reddit.com'},
{title:'LinkedIn',url:'https://linkedin.com'},{title:'Drive',url:'https://drive.google.com'},
{title:'Calendar',url:'https://calendar.google.com'},{title:'Twitter',url:'https://twitter.com'}
];
const domainToIcon = {
'grok':'bot','atlassian':'atlassian','chatgpt':'chatgpt',
'youtube':'youtube-play','github':'github','twitter':'twitter--v1','x.com':'twitter--v1',
'linkedin':'linkedin','mail.google':'gmail-new','drive.google':'google-drive--v1',
'calendar.google':'google-calendar--v1','reddit':'reddit--v1','facebook':'facebook-new',
'instagram':'instagram-new--v1','figma':'figma--v1','chat.openai':'chatgpt',
'amazon':'amazon','google':'google-logo','bing':'bing','yandex':'yandex-international',
'yahoo':'yahoo','netflix':'netflix','twitch':'twitch','discord':'discord-logo',
'spotify':'spotify','apple':'mac-os','microsoft':'windows-11','dropbox':'dropbox',
'slack':'slack-new','trello':'trello','jira':'jira','notion':'notion','whatsapp':'whatsapp--v1',
'telegram':'telegram-app','pinterest':'pinterest','tiktok':'tiktok','medium':'medium-monogram',
'quora':'quora','stackoverflow':'stack-overflow','wikipedia':'wikipedia','imdb':'imdb',
'ebay':'ebay','aliexpress':'aliexpress','paypal':'paypal','zoom':'zoom','skype':'skype',
'wordpress':'wordpress','shopify':'shopify','canva':'canva','gitlab':'gitlab',
'bitbucket':'bitbucket','aws.amazon':'amazon-web-services','cloudflare':'cloudflare',
'vimeo':'vimeo','soundcloud':'soundcloud','tumblr':'tumblr--v1','dribbble':'dribbble',
'behance':'behance','adobe':'adobe-logo','salesforce':'salesforce','hubspot':'hubspot',
'airbnb':'airbnb','booking':'booking','uber':'uber-app','lyft':'lyft','doordash':'doordash',
'cnn':'cnn','bbc':'bbc','nytimes':'new-york-times','forbes':'forbes','bloomberg':'bloomberg',
'weather.com':'weather','zillow':'zillow','yelp':'yelp','tripadvisor':'tripadvisor',
'expedia':'expedia','hulu':'hulu','disneyplus':'disney-plus','primevideo':'amazon-prime-video',
'roblox':'roblox','steam':'steam','epicgames':'epic-games','playstation':'playstation',
'xbox':'xbox','gemini.google':'google-bard','copilot.microsoft':'copilot'
};

const getIconForUrl=(url)=>{
try{
const h=new URL(url).hostname.toLowerCase();
for (const [key, icon] of Object.entries(domainToIcon)) {
    if (h.includes(key)) return icon;
}
return 'domain';
}catch(e){return 'domain';}
};

const renderGrid=(el,items)=>{
el.innerHTML=items.map(i=>`<a href="${i.url}" class="shortcut-item" title="${i.title}">
<img src="https://img.icons8.com/color/48/000000/${getIconForUrl(i.url)}.png" class="shortcut-icon" alt="">
<span class="shortcut-title">${i.title}</span></a>`).join('');
};
const loadShortcuts=async()=>{const d=await getS(['userShortcuts']);renderGrid($('shortcuts-grid'),d.userShortcuts||DEF_SC);};
const loadTopSites=()=>{chrome.topSites.get(s=>{renderGrid($('top-sites-grid'),s.slice(0,16).map(x=>({url:x.url,title:x.title||'Site'})));});};

// ===== BOOKMARKS =====
let bmData=null;
const buildBM=n=>{
if(n.url){
const a=document.createElement('a');a.className='bm-bookmark';a.href=n.url;a.title=n.title||n.url;
a.innerHTML=`<img src="https://img.icons8.com/color/24/000000/${getIconForUrl(n.url)}.png" class="bm-bookmark-icon" alt=""><span>${n.title||n.url}</span>`;
return a;
}
if(n.children&&n.children.length){
const f=document.createElement('div');f.className='bm-folder';
const h=document.createElement('div');h.className='bm-folder-header';
h.innerHTML=`<span class="bm-folder-arrow">▶</span><img src="https://img.icons8.com/color/24/000000/folder-invoices--v1.png" class="bm-bookmark-icon"><span>${n.title||'Bookmarks'}</span>`;
h.addEventListener('click',()=>f.classList.toggle('open'));
f.appendChild(h);
const c=document.createElement('div');c.className='bm-folder-children';
n.children.forEach(ch=>{const el=buildBM(ch);if(el)c.appendChild(el);});
if(c.children.length){f.appendChild(c);return f;}
}
return null;
};
const renderBMTree=tree=>{
const t=$('bookmarks-tree');t.innerHTML='';
(tree[0]?.children||[]).forEach(r=>{const el=buildBM(r);if(el){el.classList.add('open');t.appendChild(el);}});
if(!t.children.length)t.innerHTML='<div class="bm-no-results">No bookmarks</div>';
};
const loadBookmarks=()=>{chrome.bookmarks.getTree(t=>{bmData=t;renderBMTree(t);});};
let bmTimer=null;
$('bookmarks-search').addEventListener('input',e=>{
clearTimeout(bmTimer);
bmTimer=setTimeout(()=>{
const q=e.target.value.trim();
if(!q){if(bmData)renderBMTree(bmData);return;}
chrome.bookmarks.search(q,res=>{
const t=$('bookmarks-tree');t.innerHTML='';
if(!res.length){t.innerHTML='<div class="bm-no-results">No results</div>';return;}
res.slice(0,40).forEach(bm=>{
if(!bm.url)return;
const a=document.createElement('a');a.className='bm-bookmark';a.href=bm.url;
a.innerHTML=`<img src="https://img.icons8.com/color/24/000000/${getIconForUrl(bm.url)}.png" class="bm-bookmark-icon" alt=""><span>${bm.title||bm.url}</span>`;
t.appendChild(a);
});
});
},250);
});

// ===== NOTES =====
(async()=>{const d=await getL(['quickNotes']);$('quick-notes').value=d.quickNotes||'';})();
let nTimer=null;
$('quick-notes').addEventListener('input',()=>{
clearTimeout(nTimer);
const si=$('notes-save-indicator');si.textContent='saving...';si.classList.add('visible');
nTimer=setTimeout(()=>{
setL({quickNotes:$('quick-notes').value});
si.textContent='✓ saved';setTimeout(()=>si.classList.remove('visible'),1500);
},600);
});

// ===== FOCUS TIMER =====
const CIRC=2*Math.PI*54;
let tInt=null,tTotal=25*60,tRem=25*60,tRun=false;
const tp=$('timer-ring-progress');tp.style.strokeDasharray=CIRC;tp.style.strokeDashoffset=0;
const updTimer=()=>{
$('timer-minutes').textContent=String(Math.floor(tRem/60)).padStart(2,'0');
$('timer-seconds').textContent=String(tRem%60).padStart(2,'0');
tp.style.strokeDashoffset=CIRC*(1-tRem/tTotal);
};
const tick=()=>{if(tRem<=0){clearInterval(tInt);tRun=false;$('timer-start').style.display='';$('timer-pause').style.display='none';try{chrome.notifications.create('ft',{type:'basic',iconUrl:'icons/icon128.png',title:'Focus Timer',message:'Time is up! 🎉'});}catch(e){}return;}tRem--;updTimer();};
$('timer-start').addEventListener('click',()=>{if(tRem<=0)return;tRun=true;$('timer-start').style.display='none';$('timer-pause').style.display='';tInt=setInterval(tick,1000);});
$('timer-pause').addEventListener('click',()=>{tRun=false;clearInterval(tInt);$('timer-start').style.display='';$('timer-pause').style.display='none';});
$('timer-reset').addEventListener('click',()=>{clearInterval(tInt);tRun=false;tRem=tTotal;$('timer-start').style.display='';$('timer-pause').style.display='none';updTimer();});
document.querySelectorAll('.timer-preset').forEach(b=>{b.addEventListener('click',()=>{if(tRun)return;document.querySelectorAll('.timer-preset').forEach(x=>x.classList.remove('active'));b.classList.add('active');tTotal=parseInt(b.dataset.minutes)*60;tRem=tTotal;updTimer();});});
updTimer();

// ===== NEWS =====
const fetchRss=url=>new Promise(r=>chrome.runtime.sendMessage({action:'FETCH_RSS',feedUrl:url},r));
const extractImg=item=>{
try{
const enc=item.querySelector('enclosure');if(enc?.getAttribute('url'))return enc.getAttribute('url');
const mc=item.querySelector('media\\:content,media\\:thumbnail');if(mc){const u=mc.getAttribute('url')||mc.getAttribute('src');if(u)return u;}
const desc=item.querySelector('description')?.textContent||'';
const m=desc.match(/<img[^>]+src=["']?([^"'>]+)/i);if(m?.[1])return m[1];
}catch(e){}return null;
};
const loadNews=async(feeds)=>{
const CK='newsCache',TTL=30*60*1000,nc=$('news-content');
const st=await getL([CK]);const ca=st[CK];const now=Date.now();
const urls=feeds.map(f=>f.url).sort();
const match=ca?.feedUrls&&ca.feedUrls.length===urls.length&&ca.feedUrls.sort().every((u,i)=>u===urls[i]);
if(ca&&match&&(now-ca.ts)<TTL){renderNews(ca.articles);$('news-stats').textContent=`${Math.min(ca.articles.length,15)} articles · cached ${Math.round((now-ca.ts)/60000)}m ago`;return;}
nc.innerHTML='<p class="placeholder">Fetching news...</p>';
try{
const nested=await Promise.all(feeds.map(f=>fetchRss(f.url).then(r=>{
if(!r?.success)return[];
const doc=new DOMParser().parseFromString(r.data,'text/xml');
return Array.from(doc.querySelectorAll('item,entry')).slice(0,10).map(item=>{
const title=item.querySelector('title')?.textContent||'No title';
const lEl=item.querySelector('link');let link=lEl?(lEl.getAttribute('href')||lEl.textContent||''):'';
let image=extractImg(item);
try{if(image&&!/^https?:\/\//i.test(image))image=new URL(image,f.url).href;}catch(e){}
return{title,link,source:f.name,image};
});
}).catch(()=>[])));
const articles=nested.flat().sort(()=>0.5-Math.random());
await setL({[CK]:{feedUrls:feeds.map(f=>f.url),articles,ts:Date.now()}});
$('news-stats').textContent=`${Math.min(articles.length,15)} articles · just now`;
if(!articles.length){nc.innerHTML='<p class="placeholder">No news. Check RSS settings.</p>';return;}
renderNews(articles);
}catch(e){nc.innerHTML='<p class="placeholder">Failed to load news.</p>';}
};
const renderNews=articles=>{
$('news-content').innerHTML=articles.slice(0,15).map(i=>`
<div class="news-item">
${i.image?`<a href="${i.link}" target="_blank" class="news-thumb-link"><img src="${i.image}" class="news-thumb" loading="lazy" alt=""></a>`:''}
<div class="news-body-text"><a href="${i.link}" target="_blank" class="news-title">${i.title}</a><span class="news-source">${i.source}</span></div>
</div>`).join('');
};

// ===== AI CHAT (via background worker) =====
const chatForm=$('ai-chat-form'),chatInput=$('ai-chat-input'),chatMsgs=$('ai-chat-messages');
const addMsg=(text,cls)=>{const d=document.createElement('div');d.className='ai-msg '+cls;d.textContent=text;chatMsgs.appendChild(d);chatMsgs.scrollTop=chatMsgs.scrollHeight;return d;};
chatForm.addEventListener('submit',async e=>{
e.preventDefault();const q=chatInput.value.trim();if(!q)return;
addMsg(q,'ai-msg-user');chatInput.value='';
const ld=addMsg('Searching...','ai-msg-bot ai-msg-loading');
try{
const resp=await msg('AI_CHAT',{query:q});
ld.remove();
if(resp&&resp.success){addMsg(resp.answer,'ai-msg-bot');}
else{addMsg('Could not find an answer. Try rephrasing!','ai-msg-bot');}
}catch(err){ld.remove();addMsg('AI is unavailable right now.','ai-msg-bot');}
});

// ===== AI NEWS =====
const loadAINews=async()=>{
const CK='aiNewsCache',TTL=60*60*1000;
const st=await getL([CK]);const ca=st[CK];
if(ca&&(Date.now()-ca.ts)<TTL){renderAINews(ca.items);return;}
// Use AI RSS feed as source
try{
const r=await fetchRss('https://www.artificialintelligence-news.com/feed/');
if(!r?.success)throw new Error('fail');
const doc=new DOMParser().parseFromString(r.data,'text/xml');
const items=Array.from(doc.querySelectorAll('item')).slice(0,8).map(it=>({
title:it.querySelector('title')?.textContent||'',
link:it.querySelector('link')?.textContent||''
}));
await setL({[CK]:{items,ts:Date.now()}});
renderAINews(items);
}catch(e){$('ai-news-content').innerHTML='<p class="placeholder">AI news unavailable</p>';}
};
const renderAINews=items=>{
$('ai-news-content').innerHTML=items.map(i=>`
<div class="ai-news-item"><a href="${i.link}" target="_blank">${i.title}</a></div>`).join('');
};

// ===== DRAG & DROP =====
const grid=$('blocks-grid');
let dragEl=null;
let dragHandleClicked=false;
grid.addEventListener('mousedown',e=>{ dragHandleClicked=!!e.target.closest('.block-drag-handle'); });
grid.addEventListener('dragstart',e=>{
if(!dragHandleClicked){e.preventDefault();return;}
const b=e.target.closest('.block');if(!b)return;
dragEl=b;b.classList.add('dragging');
e.dataTransfer.effectAllowed='move';
e.dataTransfer.setData('text/plain',b.dataset.blockId);
});
grid.addEventListener('dragend',e=>{
const b=e.target.closest('.block');if(b)b.classList.remove('dragging');
document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));
dragEl=null;saveLayout();
});
grid.addEventListener('dragover',e=>{
e.preventDefault();e.dataTransfer.dropEffect='move';
const b=e.target.closest('.block');
if(b&&b!==dragEl){
document.querySelectorAll('.drag-over').forEach(x=>x.classList.remove('drag-over'));
b.classList.add('drag-over');
}
});
grid.addEventListener('dragleave',e=>{
const b=e.target.closest('.block');if(b)b.classList.remove('drag-over');
});
grid.addEventListener('drop',e=>{
e.preventDefault();
const target=e.target.closest('.block');
if(!target||!dragEl||target===dragEl)return;
target.classList.remove('drag-over');
const blocks=[...grid.querySelectorAll('.block')];
const dI=blocks.indexOf(dragEl),tI=blocks.indexOf(target);
if(dI<tI)target.after(dragEl);else target.before(dragEl);
saveLayout();
});

// ===== RESIZE =====
document.querySelectorAll('.block-resize').forEach(btn=>{
btn.addEventListener('click',()=>{
const block=btn.closest('.block');
const sizes=['1x1','2x1','1x2','2x2'];
const cur=block.dataset.size||'1x1';
const next=sizes[(sizes.indexOf(cur)+1)%sizes.length];
block.dataset.size=next;
saveLayout();
});
});

// ===== LAYOUT PERSISTENCE =====
const saveLayout=()=>{
const blocks=[...grid.querySelectorAll('.block')];
const layout=blocks.map(b=>({id:b.dataset.blockId,size:b.dataset.size}));
setS({blockLayout:layout});
};
const restoreLayout=async()=>{
const d=await getS(['blockLayout']);
if(!d.blockLayout)return;
const layout=d.blockLayout;
const blocks=[...grid.querySelectorAll('.block')];
const map={};blocks.forEach(b=>{map[b.dataset.blockId]=b;});
// Restore order
layout.forEach(item=>{
if(map[item.id]){
map[item.id].dataset.size=item.size||'1x1';
grid.appendChild(map[item.id]);
}
});
};

// ===== INIT =====
const init=async()=>{
await restoreLayout();
getS(['rssFeeds','backgroundUrl','storiesFeeds','storiesRssUrl']).then(d=>{
if(d.backgroundUrl){
document.body.style.backgroundImage=`linear-gradient(rgba(0,0,0,0.4),rgba(0,0,0,0.55)),url(${d.backgroundUrl})`;
document.body.style.backgroundSize='cover';document.body.style.backgroundPosition='center';
}
const feeds=d.rssFeeds||[{name:'BBC News',url:'http://feeds.bbci.co.uk/news/rss.xml'}];
loadNews(feeds);
// Support new storiesFeeds array, fallback to old storiesRssUrl
let stFeeds=d.storiesFeeds;
if(!stFeeds||!stFeeds.length){
const oldUrl=d.storiesRssUrl||'https://feeds.bbci.co.uk/news/rss.xml';
stFeeds=[{name:'BBC News',url:oldUrl}];
}
loadInternetStories(stFeeds);
});
loadWeather();
loadTopSites();
loadShortcuts();
loadBookmarks();
loadFact();
loadAINews();
document.body.classList.add('ready');
};
init();
});