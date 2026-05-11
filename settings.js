document.addEventListener('DOMContentLoaded',()=>{
const $=id=>document.getElementById(id);
let tempUnit='C';

$('temp-c').addEventListener('click',()=>{tempUnit='C';$('temp-c').classList.add('active');$('temp-f').classList.remove('active');});
$('temp-f').addEventListener('click',()=>{tempUnit='F';$('temp-f').classList.add('active');$('temp-c').classList.remove('active');});

const createRow=(container,cls,data,fields)=>{
const div=document.createElement('div');div.className=cls;
div.innerHTML=fields.map(f=>`<input type="text" class="${f.cls}" placeholder="${f.ph}" value="${data[f.key]||''}">`).join('')+`<button class="remove-btn">−</button>`;
container.appendChild(div);
div.querySelector('.remove-btn').addEventListener('click',()=>div.remove());
};

const loadSettings=()=>{
chrome.storage.sync.get(['searchEngine','backgroundUrl','rssFeeds','userShortcuts','tempUnit','storiesRssUrl','storiesFeeds'],d=>{
$('search-engine').value=d.searchEngine||'https://www.google.com/search?q=';
$('background-url').value=d.backgroundUrl||'';
tempUnit=d.tempUnit||'C';
if(tempUnit==='F'){$('temp-f').classList.add('active');$('temp-c').classList.remove('active');}

// News RSS feeds
$('rss-feeds-list').innerHTML='';
(d.rssFeeds||[{name:'BBC News',url:'http://feeds.bbci.co.uk/news/rss.xml'}]).forEach(f=>
createRow($('rss-feeds-list'),'rss-feed-item',f,[{cls:'rss-name',ph:'Feed Name',key:'name'},{cls:'rss-url',ph:'Feed URL',key:'url'}]));

// Stories RSS feeds — migrate from old single storiesRssUrl if needed
let storiesFeeds = d.storiesFeeds;
if(!storiesFeeds || !storiesFeeds.length){
    const oldUrl = d.storiesRssUrl || 'https://feeds.bbci.co.uk/news/rss.xml';
    storiesFeeds = [{name:'BBC News',url:oldUrl}];
}
$('stories-feeds-list').innerHTML='';
storiesFeeds.forEach(f=>
createRow($('stories-feeds-list'),'stories-feed-item',f,[{cls:'stories-name',ph:'Feed Name',key:'name'},{cls:'stories-url',ph:'Feed URL',key:'url'}]));

// Shortcuts
$('shortcuts-list').innerHTML='';
(d.userShortcuts||[
{title:'YouTube',url:'https://youtube.com'},{title:'Gmail',url:'https://mail.google.com'},
{title:'GitHub',url:'https://github.com'},{title:'Reddit',url:'https://reddit.com'},
{title:'LinkedIn',url:'https://linkedin.com'},{title:'Drive',url:'https://drive.google.com'},
{title:'Calendar',url:'https://calendar.google.com'},{title:'Twitter',url:'https://twitter.com'}
]).forEach(s=>createRow($('shortcuts-list'),'shortcut-item-row',s,[{cls:'sc-name',ph:'Name',key:'title'},{cls:'sc-url',ph:'URL',key:'url'}]));
});
};

$('add-rss-feed').addEventListener('click',()=>createRow($('rss-feeds-list'),'rss-feed-item',{},[{cls:'rss-name',ph:'Feed Name',key:'name'},{cls:'rss-url',ph:'Feed URL',key:'url'}]));
$('add-stories-feed').addEventListener('click',()=>createRow($('stories-feeds-list'),'stories-feed-item',{},[{cls:'stories-name',ph:'Feed Name',key:'name'},{cls:'stories-url',ph:'Feed URL',key:'url'}]));
$('add-shortcut').addEventListener('click',()=>createRow($('shortcuts-list'),'shortcut-item-row',{},[{cls:'sc-name',ph:'Name',key:'title'},{cls:'sc-url',ph:'URL',key:'url'}]));

$('reset-layout').addEventListener('click',()=>{
chrome.storage.sync.remove('blockLayout',()=>{
$('status-message').textContent='Layout reset!';
setTimeout(()=>$('status-message').textContent='',2000);
});
});

$('save-settings').addEventListener('click',()=>{
const rssFeeds=[];
document.querySelectorAll('.rss-feed-item').forEach(item=>{
const n=item.querySelector('.rss-name').value.trim(),u=item.querySelector('.rss-url').value.trim();
if(n&&u)rssFeeds.push({name:n,url:u});
});
const storiesFeeds=[];
document.querySelectorAll('.stories-feed-item').forEach(item=>{
const n=item.querySelector('.stories-name').value.trim(),u=item.querySelector('.stories-url').value.trim();
if(n&&u)storiesFeeds.push({name:n,url:u});
});
const userShortcuts=[];
document.querySelectorAll('.shortcut-item-row').forEach(item=>{
const t=item.querySelector('.sc-name').value.trim();let u=item.querySelector('.sc-url').value.trim();
if(t&&u){if(!/^https?:\/\//i.test(u))u='https://'+u;userShortcuts.push({title:t,url:u});}
});
chrome.storage.sync.set({
searchEngine:$('search-engine').value,
backgroundUrl:$('background-url').value.trim(),
storiesFeeds,
rssFeeds,userShortcuts,tempUnit
},()=>{
chrome.storage.local.remove(['weatherCache','wallpaperCache','storiesCache']);
// Also remove old storiesRssUrl key
chrome.storage.sync.remove('storiesRssUrl');
$('status-message').textContent='✓ Saved!';
setTimeout(()=>{$('status-message').textContent='';window.close();},1000);
});
});

loadSettings();
});