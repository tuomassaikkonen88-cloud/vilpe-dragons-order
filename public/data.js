(function(root){
const CLASSES=[
 {id:'paladin',tag:'might', ic:'🛡️',en:'Vent Paladin',fi:'Tuuletinpaladiini'},
 {id:'ranger', tag:'scout', ic:'🏹',en:'Roof Ranger',fi:'Kattosamooja'},
 {id:'bard',   tag:'charm', ic:'🎻',en:'Sales Bard',fi:'Myyntibardi'},
 {id:'rogue',  tag:'cunning',ic:'🗝️',en:'Logistics Rogue',fi:'Logistiikkaroisto'},
 {id:'wizard', tag:'arcane',ic:'🔮',en:'AI Wizard',fi:'Tekoälyvelho'},
 {id:'dwarf',  tag:'craft', ic:'⚒️',en:'Forge Dwarf',fi:'Pajakääpiö'}
];
const TAGS={might:{en:'Might',fi:'Voima'},scout:{en:'Scouting',fi:'Tiedustelu'},charm:{en:'Charm',fi:'Karisma'},cunning:{en:'Cunning',fi:'Oveluus'},arcane:{en:'Arcane',fi:'Taikuus'},craft:{en:'Craft',fi:'Käsityö'}};
const SCENES=[
{dc:11,
 en:{t:"The Dragon's Order",n:"A shadow falls over the Grand Vent Forge. Emberbeard, the oldest dragon of the Northern Peaks, lands on the loading dock and drops a scroll the size of a door. His lair is damp, his gold is turning green and his treasure smells like a wet sauna towel. He wants 10,000 VILPE roof vents installed by dawn. How does the guild answer?"},
 fi:{t:"Lohikäärmeen tilaus",n:"Varjo lankeaa VILPEn Suuren Tuuletinpajan ylle. Hiiliparta, Pohjoisvuorten vanhin lohikäärme, laskeutuu lastauslaiturille ja pudottaa oven kokoisen käärön. Hänen luolansa on kostea, kulta vihertää ja aarre haisee märältä saunapyyhkeeltä. Hän haluaa 10 000 VILPE-kattotuuletinta asennettuna aamunkoittoon mennessä. Miten kilta vastaa?"},
 o:[
  {tag:'charm',win:{g:0,v:0,m:15},lose:{g:0,v:0,m:-10},
   en:{t:"Accept with a dazzling sales pitch",w:"Emberbeard purrs like a furnace. Nobody has ever called him a valued key account before.",l:"The pitch includes the word synergy. Emberbeard singes the brochure, and the presenter's eyebrows."},
   fi:{t:"Hyväksy häikäisevällä myyntipuheella",w:"Hiiliparta kehrää kuin masuuni. Kukaan ei ole ennen kutsunut häntä arvokkaaksi avainasiakkaaksi.",l:"Myyntipuheessa vilahtaa sana synergia. Hiiliparta kärventää esitteen ja esittäjän kulmakarvat."}},
  {tag:'cunning',win:{g:150,v:0,m:-5},lose:{g:0,v:0,m:-20},
   en:{t:"Haggle for payment up front",w:"A chest of gold thuds onto the counter. Emberbeard is impressed, and a little annoyed.",l:"Emberbeard does not do advance payments. He does do advance roasting."},
   fi:{t:"Tingi maksu etukäteen",w:"Kulta-arkku tömähtää tiskille. Hiiliparta on vaikuttunut ja hieman ärtynyt.",l:"Hiiliparta ei tee ennakkomaksuja. Ennakkopaistoja kyllä."}},
  {tag:'arcane',win:{g:50,v:0,m:10},lose:{g:-20,v:0,m:-5},
   en:{t:"Scan the lair with the VILPE Sense crystal",w:"The crystal glows: humidity 97%, gold oxidising. The dragon is moved that someone finally measured his problem.",l:"The crystal connects to the wrong lair and streams a troll's bathroom. Live."},
   fi:{t:"Skannaa luola VILPE Sense -kristallilla",w:"Kristalli hehkuu: kosteus 97 %, kulta hapettuu. Lohikäärme liikuttuu, sillä vihdoin joku mittasi hänen ongelmansa.",l:"Kristalli yhdistää väärään luolaan ja striimaa peikon kylpyhuonetta. Suorana."}}
 ]},
{dc:12,
 en:{t:"The Forge at Midnight",n:"10,000 vents by dawn means the Grand Vent Forge must run hotter than ever. The moulding machines hiss, the night is long and the coffee is running low. How do we ramp up production?"},
 fi:{t:"Paja keskiyöllä",n:"10 000 tuuletinta aamuun mennessä: Suuren Tuuletinpajan on käytävä kuumempana kuin koskaan. Valukoneet sihisevät, yö on pitkä ja kahvi loppumassa. Miten tuotanto nostetaan?"},
 o:[
  {tag:'craft',win:{g:0,v:5000,m:0},lose:{g:-30,v:1500,m:0},
   en:{t:"Overclock the Great Moulding Machine",w:"The machine sings in a deep dwarven baritone and spits out vents faster than anyone can count.",l:"The machine overheats, makes one perfect vent, then a cloud of smoke shaped like the CEO."},
   fi:{t:"Ylikellota Suuri Valukone",w:"Kone laulaa syvää kääpiöbaritonia ja sylkee tuulettimia nopeammin kuin kukaan ehtii laskea.",l:"Kone ylikuumenee, tekee yhden täydellisen tuulettimen ja sitten toimitusjohtajan muotoisen savupilven."}},
  {tag:'charm',win:{g:-20,v:4500,m:0},lose:{g:-40,v:2000,m:0},
   en:{t:"Recruit the goblin night shift",w:"Forty goblins sign up for pizza and glory. It turns out they love quality control.",l:"The goblins unionise at 2 a.m. and demand dental care. Production pauses for negotiations."},
   fi:{t:"Värvää hiisien yövuoro",w:"Neljäkymmentä hiittä pestautuu pizzasta ja kunniasta. Paljastuu, että ne rakastavat laadunvalvontaa.",l:"Hiidet perustavat ammattiliiton kello kaksi yöllä ja vaativat hammashoidon. Tuotanto seisoo neuvottelujen ajan."}},
  {tag:'arcane',win:{g:0,v:6000,m:0},lose:{g:0,v:500,m:-10},
   en:{t:"Enchant the line with AI runes",w:"The AI runes optimise everything. The forge now produces vents and motivational quotes.",l:"The AI decides the optimal number of vents is three. It is very confident about this."},
   fi:{t:"Lumoa linja tekoälyriimuilla",w:"Tekoälyriimut optimoivat kaiken. Paja tuottaa nyt tuulettimia ja motivaatiolainauksia.",l:"Tekoäly päättää, että optimaalinen määrä on kolme tuuletinta. Se on asiasta hyvin varma."}}
 ]},
{dc:12,
 en:{t:"The Roof Trolls Strike",n:"Disaster! The raw material caravan from the coast has been ambushed by roof trolls. They have hauled everything onto the rooftops of Old Town and are using our plastic granulate as a ball pit."},
 fi:{t:"Kattopeikkojen hyökkäys",n:"Katastrofi! Rannikolta tuleva raaka-ainekaravaani on joutunut kattopeikkojen väijytykseen. Ne ovat raahanneet kaiken Vanhankaupungin katoille ja käyttävät muovirakeitamme pallomerenä."},
 o:[
  {tag:'might',win:{g:30,v:2500,m:0},lose:{g:0,v:-1000,m:0},
   en:{t:"Charge the rooftops",w:"A heroic charge across the ridges. The trolls flee and leave a few gold coins behind.",l:"The charge meets a slippery roof. Half the guild slides into a hay cart and the trolls keep the granulate."},
   fi:{t:"Rynnäkkö katoille",w:"Sankarillinen rynnäkkö harjakattojen yli. Peikot pakenevat ja jättävät jälkeensä muutaman kultakolikon.",l:"Rynnäkkö kohtaa liukkaan katon. Puolet killasta liukuu heinäkärryyn, ja peikot pitävät rakeet."}},
  {tag:'scout',win:{g:0,v:3000,m:0},lose:{g:0,v:500,m:0},
   en:{t:"Track them across the rooftops",w:"Silent as a chimney draft, the rangers recover every last bag.",l:"The trail leads to a chimney. Then another chimney. Then lunch."},
   fi:{t:"Jäljitä ne kattoja pitkin",w:"Hiljaa kuin hormin veto samoojat nappaavat takaisin viimeistäkin säkkiä myöten.",l:"Jäljet johtavat savupiippuun. Sitten toiseen savupiippuun. Sitten lounaalle."}},
  {tag:'cunning',win:{g:40,v:2000,m:10},lose:{g:-50,v:0,m:0},
   en:{t:"Strike a deal with the trolls",w:"The trolls trade the granulate back for VILPE vents for their damp caves. A brand new customer segment!",l:"The trolls out-negotiate us. We now owe them gold and a monthly newsletter."},
   fi:{t:"Tee diili peikkojen kanssa",w:"Peikot vaihtavat rakeet takaisin VILPE-tuulettimiin kosteisiin luoliinsa. Upouusi asiakassegmentti!",l:"Peikot neuvottelevat meidät nurkkaan. Olemme nyt heille velkaa kultaa ja kuukausittaisen uutiskirjeen."}}
 ]},
{dc:13,
 en:{t:"The Delivery",n:"The vents are packed. Between the forge and Emberbeard's lair lie the Misty Mountains, a troll bridge with a strict toll policy, and three hours until dawn. How do we deliver?"},
 fi:{t:"Toimitus",n:"Tuulettimet on pakattu. Pajan ja Hiiliparran luolan välissä ovat Sumuvuoret, tiukan tullipolitiikan peikkosilta ja kolme tuntia aamunkoittoon. Miten toimitamme?"},
 o:[
  {tag:'scout',win:{g:0,v:1000,m:10},lose:{g:0,v:-2000,m:0},
   en:{t:"Fly with rented griffins",w:"The griffins land at the lair early. Emberbeard writes it down: supplier on time.",l:"The griffins spot a sheep farm. Several pallets are now somewhere over Sweden."},
   fi:{t:"Lennä vuokragriffoneilla",w:"Griffonit laskeutuvat luolalle etuajassa. Hiiliparta kirjaa: toimittaja täsmällinen.",l:"Griffonit huomaavat lammastilan. Useita lavoja on nyt jossain Ruotsin yllä."}},
  {tag:'might',win:{g:0,v:1500,m:0},lose:{g:-30,v:-1500,m:0},
   en:{t:"Convoy over the troll bridge",w:"The convoy rolls through. The bridge troll respects a firm handshake and waives the toll.",l:"The troll charges one vent per wheel. The convoy has a lot of wheels."},
   fi:{t:"Saattue peikkosillan yli",w:"Saattue jyrää läpi. Siltapeikko arvostaa jämäkkää kättelyä ja antaa tullin anteeksi.",l:"Peikko vaatii tullia yhden tuulettimen per pyörä. Saattueessa on paljon pyöriä."}},
  {tag:'arcane',win:{g:0,v:0,m:15},lose:{g:0,v:-1000,m:-10},
   en:{t:"Open a portal straight into the lair",w:"Whoosh! The vents arrive in a neat stack and Emberbeard is delighted by the express service.",l:"The portal opens into the neighbouring dragon's lair. She is now a very happy VILPE customer. He is not."},
   fi:{t:"Avaa portaali suoraan luolaan",w:"Vuuh! Tuulettimet saapuvat siistissä pinossa, ja Hiiliparta ihastuu pikatoimitukseen.",l:"Portaali aukeaa naapurilohikäärmeen luolaan. Hän on nyt hyvin tyytyväinen VILPE-asiakas. Hiiliparta ei ole."}}
 ]},
{dc:14,
 en:{t:"The Final Inspection",n:"Dawn breaks. Emberbeard circles his mountain and inspects every vent with one enormous eye. Somewhere a nervous project manager clutches a checklist. One last chance to win him over."},
 fi:{t:"Lopputarkastus",n:"Aamu sarastaa. Hiiliparta kiertää vuortaan ja tarkastaa jokaisen tuulettimen yhdellä valtavalla silmällä. Jossain hermostunut projektipäällikkö puristaa tarkistuslistaa. Viimeinen tilaisuus voittaa hänet puolelleen."},
 o:[
  {tag:'charm',win:{g:100,v:0,m:25},lose:{g:0,v:0,m:-20},
   en:{t:"Give an epic handover speech",w:"The speech brings a tear to a dragon's eye. It evaporates instantly, but it counts.",l:"The speech runs 40 minutes over. Emberbeard falls asleep and snores fire onto the invoice."},
   fi:{t:"Pidä eeppinen luovutuspuhe",w:"Puhe nostaa kyyneleen lohikäärmeen silmään. Se haihtuu heti, mutta se lasketaan.",l:"Puhe venyy 40 minuuttia yli. Hiiliparta nukahtaa ja kuorsaa tulta laskun päälle."}},
  {tag:'craft',win:{g:80,v:0,m:20},lose:{g:-50,v:0,m:-25},
   en:{t:"Show off the flawless installation",w:"Every vent is level, sealed and beautiful. Emberbeard has never seen such craftsmanship.",l:"One vent is upside down. Emberbeard notices. Emberbeard always notices."},
   fi:{t:"Esittele virheetön asennus",w:"Jokainen tuuletin on suorassa, tiivis ja kaunis. Hiiliparta ei ole koskaan nähnyt tällaista käsityötä.",l:"Yksi tuuletin on ylösalaisin. Hiiliparta huomaa sen. Hiiliparta huomaa aina."}},
  {tag:'arcane',win:{g:0,v:0,m:30},lose:{g:0,v:0,m:-15},
   en:{t:"Show the live VILPE Sense data",w:"Humidity in the lair drops in real time. The gold shines again. Emberbeard orders a dashboard for every cave.",l:"The demo freezes on the loading screen. It worked this morning, says the wizard."},
   fi:{t:"Näytä VILPE Sense -data livenä",w:"Luolan kosteus laskee reaaliajassa. Kulta kiiltää taas. Hiiliparta tilaa kojelaudan jokaiseen luolaan.",l:"Demo jäätyy latausruutuun. Aamulla se toimi, sanoo velho."}}
 ]}
];
const ENDINGS={
 legendary:{en:{t:"Legend of the Vent Forge",n:"Emberbeard is so pleased that he signs on as VILPE's official distributor for every dragon lair in the realm. Bards will sing of this guild for generations, mostly about the roof vents."},
            fi:{t:"Tuuletinpajan legenda",n:"Hiiliparta on niin tyytyväinen, että hänestä tulee VILPEn virallinen jälleenmyyjä kaikkiin valtakunnan lohikäärmeluoliin. Bardit laulavat killasta sukupolvien ajan, lähinnä kattotuulettimista."}},
 success:{en:{t:"Paid in Full",n:"The lair is dry, the gold shines and the invoice is paid with only light scorch marks. Another satisfied customer for the Grand Vent Forge."},
          fi:{t:"Maksettu kokonaan",n:"Luola on kuiva, kulta kiiltää ja lasku on maksettu vain kevyin kärventymisjäljin. Jälleen yksi tyytyväinen asiakas Suurelle Tuuletinpajalle."}},
 messy:{en:{t:"A Bit Singed",n:"Emberbeard grumbles, pays half and demands a service contract. The guild survives with slightly shorter eyebrows. Not bad for one night's work."},
        fi:{t:"Hieman kärventynyt",n:"Hiiliparta murisee, maksaa puolet ja vaatii huoltosopimuksen. Kilta selviää hieman lyhyemmin kulmakarvoin. Ei paha yhden yön työksi."}},
 disaster:{en:{t:"A Glorious Disaster",n:"Emberbeard roasts the loading dock in a fury. Luckily the forge is now extremely well ventilated, and the smoke clears in record time."},
           fi:{t:"Loistelias katastrofi",n:"Hiiliparta grillaa lastauslaiturin raivoissaan. Onneksi paja on nyt erinomaisesti tuuletettu, ja savu poistuu ennätysajassa."}}
};
const T={
en:{title:"The Dragon's Order",sub:"A party adventure in the Grand Vent Forge of VILPE",run:"Run the game (big screen + DM)",join:"Join as a player",
 connecting:"Connecting to the guild hall…",noRoom:"Can't connect to the live game from here. Make sure you are signed in to claude.ai and opened the link the host shared with you.",
 yourName:"Your hero's name",namePh:"e.g. Sir Ventsalot",pickClass:"Pick your class",joinBtn:"Join the guild",bonusOn:"+3 on",
 waitDM:"Waiting for the Dungeon Master…",inLobby:"You're in the guild! Watch the big screen, the adventure starts soon.",change:"Change hero",
 listen:"Listen to the Dungeon Master…",voteNow:"Vote for the guild's plan",voted:"Vote cast. You can still change it.",yourBonus:"+3 for you!",
 rollNow:"Roll for the guild!",tapRoll:"Tap the die",chosen:"The guild chose",rolled:"Your roll",bonus:"class bonus",nat20:"NATURAL 20! Legendary!",nat1:"NATURAL 1… the dragon saw that.",
 waitReveal:"Waiting for the DM to reveal the guild's fate…",groupAvg:"Guild average",dc:"Difficulty",
 tier_legendary:"Legendary success!",tier_success:"Success",tier_partial:"Partial success",partialNote:"Below the difficulty, but close: the plan only half works. Half rewards.",tier_fail:"Failure",
 gold:"Gold",vents:"Vents delivered",mood:"Dragon mood",of:"of",
 mood0:"Furious",mood1:"Grumpy",mood2:"Watchful",mood3:"Pleased",mood4:"Delighted",
 scene:"Scene",theEnd:"The End",awards:"Guild awards",
 aw_mvp:"Guild MVP",aw_luck:"Luckiest roller",aw_fumble:"Critical fumbler",aw_snack:"Dragon's favourite snack",youWon:"That's you!",
 // host
 scanJoin:"Scan to join the guild",openLink:"Open the game link on your phone",heroes:"Heroes in the guild",noHeroes:"No heroes yet. Scan the code!",
 pasteLink:"Paste the game's share link here to show a QR code",qrHint:"Paste the share link in the DM bar to show a QR code",
 voteOnPhones:"Vote on your phones!",rollOnPhones:"Grab your phone and roll the d20!",votesCast:"votes",rolledN:"rolled",
 noPhones:"No phones? Count raised hands with the + buttons.",
 begin:"Begin the adventure",openVote:"Open voting",closeVote:"Close voting",reveal:"Reveal the guild's fate",next:"Next scene",finale:"Final judgement",showAwards:"Show the awards",newGame:"New game",sure:"Sure? Click again",
 guildDie:"Roll a guild die",guild:"Guild die",hands:"Hands",fullscreen:"Fullscreen",live:"Live",offline:"Offline: hand votes and guild dice only",
 crits:"Natural 20s",fumbles:"Natural 1s",best:"Top roll",tieBreak:"A tie! The dice decided.",
 prologue:"Tonight the Grand Vent Forge of VILPE takes on its strangest customer yet. Create your hero on your phone: every class gets +3 on its own kind of challenge.",
 tagHelp:"Bonus classes",reconnecting:"Reconnecting…",inRoom:"connected",waking:"Waking up the forge… (can take up to a minute)",hostKeyBad:"Wrong DM key. Open the DM link with the correct ?key=",joinUrl:"or open",onlineN:"online",kick:"Remove"},
fi:{title:"Lohikäärmeen tilaus",sub:"Juhla-seikkailu VILPEn Suuressa Tuuletinpajassa",run:"Pyöritä peliä (iso näyttö + pelinjohtaja)",join:"Liity pelaajaksi",
 connecting:"Yhdistetään kiltasaliin…",noRoom:"Live-peliin ei saada yhteyttä täältä. Varmista, että olet kirjautunut claude.ai:hin ja avasit linkin, jonka pelinjohtaja jakoi.",
 yourName:"Sankarisi nimi",namePh:"esim. Herra Tuuletin",pickClass:"Valitse hahmoluokka",joinBtn:"Liity kiltaan",bonusOn:"+3:",
 waitDM:"Odotetaan pelinjohtajaa…",inLobby:"Olet killassa! Seuraa isoa näyttöä, seikkailu alkaa pian.",change:"Vaihda sankari",
 listen:"Kuuntele pelinjohtajaa…",voteNow:"Äänestä killan suunnitelmaa",voted:"Ääni annettu. Voit vielä vaihtaa.",yourBonus:"+3 sinulle!",
 rollNow:"Heitä killan puolesta!",tapRoll:"Napauta noppaa",chosen:"Kilta valitsi",rolled:"Heittosi",bonus:"luokkabonus",nat20:"LUONNOLLINEN 20! Legendaarista!",nat1:"LUONNOLLINEN 1… lohikäärme näki tuon.",
 waitReveal:"Odotetaan, että pelinjohtaja paljastaa killan kohtalon…",groupAvg:"Killan keskiarvo",dc:"Vaikeus",
 tier_legendary:"Legendaarinen onnistuminen!",tier_success:"Onnistui",tier_partial:"Osittainen onnistuminen",partialNote:"Vaikeuden alle, mutta lähellä: suunnitelma onnistuu vain puoliksi. Puolet palkinnoista.",tier_fail:"Epäonnistui",
 gold:"Kulta",vents:"Toimitetut tuulettimet",mood:"Lohikäärmeen mieliala",of:"/",
 mood0:"Raivoissaan",mood1:"Ärtynyt",mood2:"Valpas",mood3:"Tyytyväinen",mood4:"Ihastunut",
 scene:"Kohtaus",theEnd:"Loppu",awards:"Killan palkinnot",
 aw_mvp:"Killan MVP",aw_luck:"Onnekkain heittäjä",aw_fumble:"Kriittinen kömpelys",aw_snack:"Lohikäärmeen lempivälipala",youWon:"Se olet sinä!",
 scanJoin:"Skannaa ja liity kiltaan",openLink:"Avaa pelin linkki puhelimella",heroes:"Sankarit killassa",noHeroes:"Ei vielä sankareita. Skannaa koodi!",
 pasteLink:"Liitä pelin jakolinkki tähän, niin QR-koodi näkyy",qrHint:"Liitä jakolinkki pelinjohtajan palkkiin, niin QR-koodi näkyy",
 voteOnPhones:"Äänestäkää puhelimilla!",rollOnPhones:"Puhelimet esiin ja d20 heittoon!",votesCast:"ääntä",rolledN:"heittänyt",
 noPhones:"Ei puhelimia? Laske nostetut kädet +-napeilla.",
 begin:"Aloita seikkailu",openVote:"Avaa äänestys",closeVote:"Sulje äänestys",reveal:"Paljasta killan kohtalo",next:"Seuraava kohtaus",finale:"Lopullinen tuomio",showAwards:"Näytä palkinnot",newGame:"Uusi peli",sure:"Varmasti? Klikkaa uudelleen",
 guildDie:"Heitä killan noppa",guild:"Killan noppa",hands:"Kädet",fullscreen:"Koko näyttö",live:"Yhteys päällä",offline:"Ei yhteyttä: vain käsiäänestys ja killan nopat",
 crits:"Luonnolliset 20:t",fumbles:"Luonnolliset 1:t",best:"Paras heitto",tieBreak:"Tasapeli! Noppa ratkaisi.",
 prologue:"Tänä yönä VILPEn Suuri Tuuletinpaja kohtaa kaikkien aikojen oudoimman asiakkaansa. Luo sankarisi puhelimella: jokainen luokka saa +3 omanlaisiinsa haasteisiin.",
 tagHelp:"Bonusluokat",reconnecting:"Yhdistetään uudelleen…",inRoom:"yhteydessä",waking:"Herätellään pajaa… (voi kestää minuutin)",hostKeyBad:"Väärä pelinjohtajan avain. Avaa DM-linkki oikealla ?key=-arvolla",joinUrl:"tai avaa",onlineN:"paikalla",kick:"Poista"}
};


const cls=id=>CLASSES.find(c=>c.id===id);
const d20=()=>1+Math.floor(Math.random()*20);
const rollTotal=(r,clsId,tag)=>r===1?0:r+(cls(clsId)&&cls(clsId).tag===tag?3:0)+(r===20?5:0);
const tierOf=(avg,dc)=>avg>=dc+5?'legendary':avg>=dc?'success':avg>=dc-3?'partial':'fail';
const GAME={CLASSES,TAGS,SCENES,ENDINGS,T,cls,d20,rollTotal,tierOf};
if(typeof module!=='undefined'&&module.exports)module.exports=GAME;else root.GAME=GAME;
})(this);
