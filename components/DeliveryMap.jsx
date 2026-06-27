import { Platform, View, Text } from 'react-native'
import { WebView } from 'react-native-webview'
import { Map as MapIcon } from 'lucide-react-native'
import { C } from './ui'

function makeHtml(depot, stops, line) {
  const data = JSON.stringify({ depot, stops, line })
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#0B0F1A}.leaflet-popup-content{font-family:sans-serif;font-size:13px}</style>
</head><body><div id="map"></div>
<script>
var D = ${data};
var map = L.map('map',{zoomControl:false,attributionControl:false,scrollWheelZoom:false}).setView([D.depot.lat,D.depot.lng],12);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:19}).addTo(map);
var di = L.divIcon({className:'',html:'<div style="width:30px;height:30px;border-radius:9px;background:#10b981;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px">&#127981;</div>',iconSize:[30,30],iconAnchor:[15,15]});
L.marker([D.depot.lat,D.depot.lng],{icon:di}).addTo(map).bindPopup(D.depot.label||'Склад');
var pts=[[D.depot.lat,D.depot.lng]];
D.stops.forEach(function(s){
  var bg = s.priority?'#f43f5e':'#7c6cff';
  var si=L.divIcon({className:'',html:'<div style="width:26px;height:26px;border-radius:50%;background:'+bg+';border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px">'+s.n+'</div>',iconSize:[26,26],iconAnchor:[13,13]});
  L.marker([s.lat,s.lng],{icon:si}).addTo(map).bindPopup('<b>'+s.n+'. '+(s.title||'')+'</b><br>'+(s.label||''));
  pts.push([s.lat,s.lng]);
});
var routeLine = D.line;
if(!routeLine){ routeLine=[[D.depot.lat,D.depot.lng]]; D.stops.forEach(function(s){routeLine.push([s.lat,s.lng])}); routeLine.push([D.depot.lat,D.depot.lng]); }
L.polyline(routeLine,{color:'#7c6cff',weight:4,opacity:0.85,lineJoin:'round'}).addTo(map);
if(pts.length>1) map.fitBounds(pts,{padding:[30,30],maxZoom:14});
</script></body></html>`
}

export function DeliveryMap({ depot, stops = [], line = null, height = 260 }) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ height }} className="rounded-2xl bg-surface-2 border border-line items-center justify-center">
        <MapIcon size={28} color={C.muted} />
        <Text className="text-muted text-[13px] mt-2">Карта доступна на телефоне</Text>
      </View>
    )
  }
  return (
    <View style={{ height, borderRadius: 16, overflow: 'hidden', backgroundColor: C.surface2 }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: makeHtml(depot, stops, line) }}
        style={{ flex: 1, backgroundColor: C.surface2 }}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  )
}
