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
 en:{t:"The Dragon's Order",n:"Midnight at the Grand Vent Forge. The night shift is just finishing its coffee when a shadow falls over the yard and every window starts to rattle. Emberbeard, the oldest dragon of the Northern Peaks, lands on the loading dock and drops an order scroll the size of a barn door. His lair is damp, his gold is turning green and his treasure smells like a wet sauna towel. He wants 10,000 VILPE roof vents installed by dawn, and he is not known for his patience with suppliers. How does the guild answer?"},
 fi:{t:"Lohikäärmeen tilaus",n:"Keskiyö Suuressa Tuuletinpajassa. Yövuoro on juuri juomassa kahviaan, kun piha pimenee ja jokainen ikkuna alkaa helistä. Hiiliparta, Pohjoisvuorten vanhin lohikäärme, laskeutuu lastauslaiturille ja pudottaa ladon oven kokoisen tilauskäärön. Hänen luolansa on kostea, kulta vihertää ja aarre haisee märältä saunapyyhkeeltä. Hän haluaa 10 000 VILPE-kattotuuletinta asennettuna aamunkoittoon mennessä, eikä hän ole tunnettu kärsivällisyydestään toimittajia kohtaan. Miten kilta vastaa?"},
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
 en:{t:"The Forge at Midnight",n:"The order is accepted, and the clock is ticking. Ten thousand vents by dawn means the Grand Vent Forge must run hotter than ever before. The moulding machines hiss, the conveyor belts rattle, and somewhere a production planner quietly redraws the whole week's schedule. The coffee is running low and the night is long. How do we ramp up production?"},
 fi:{t:"Paja keskiyöllä",n:"Tilaus on hyväksytty, ja kello käy. Kymmenentuhatta tuuletinta aamuun mennessä tarkoittaa, että Suuren Tuuletinpajan on käytävä kuumempana kuin koskaan. Valukoneet sihisevät, kuljettimet kolisevat, ja jossain tuotannonsuunnittelija piirtää hiljaa koko viikon aikataulun uusiksi. Kahvi on loppumassa ja yö on pitkä. Miten tuotanto nostetaan?"},
 o:[
  {tag:'craft',win:{g:0,v:6500,m:0},lose:{g:-30,v:1500,m:0},
   en:{t:"Overclock the Great Moulding Machine",w:"The machine sings in a deep dwarven baritone and spits out vents faster than anyone can count.",l:"The machine overheats, makes one perfect vent, then a cloud of smoke shaped like the CEO."},
   fi:{t:"Ylikellota Suuri Valukone",w:"Kone laulaa syvää kääpiöbaritonia ja sylkee tuulettimia nopeammin kuin kukaan ehtii laskea.",l:"Kone ylikuumenee, tekee yhden täydellisen tuulettimen ja sitten toimitusjohtajan muotoisen savupilven."}},
  {tag:'charm',win:{g:-20,v:6000,m:0},lose:{g:-40,v:2000,m:0},
   en:{t:"Recruit the goblin night shift",w:"Forty goblins sign up for pizza and glory. It turns out they love quality control.",l:"The goblins unionise at 2 a.m. and demand dental care. Production pauses for negotiations."},
   fi:{t:"Värvää hiisien yövuoro",w:"Neljäkymmentä hiittä pestautuu pizzasta ja kunniasta. Paljastuu, että ne rakastavat laadunvalvontaa.",l:"Hiidet perustavat ammattiliiton kello kaksi yöllä ja vaativat hammashoidon. Tuotanto seisoo neuvottelujen ajan."}},
  {tag:'arcane',win:{g:0,v:7500,m:0},lose:{g:0,v:500,m:-10},
   en:{t:"Enchant the line with AI runes",w:"The AI runes optimise everything. The forge now produces vents and motivational quotes.",l:"The AI decides the optimal number of vents is three. It is very confident about this."},
   fi:{t:"Lumoa linja tekoälyriimuilla",w:"Tekoälyriimut optimoivat kaiken. Paja tuottaa nyt tuulettimia ja motivaatiolainauksia.",l:"Tekoäly päättää, että optimaalinen määrä on kolme tuuletinta. Se on asiasta hyvin varma."}}
 ]},
{dc:12,
 en:{t:"The Roof Troll Raid",n:"Around three in the morning the warehouse alarm goes off. Roof trolls! These grey, mossy creatures live under leaky, damp roofs, and a well-ventilated roof is their worst nightmare. When they heard about the dragon's order, they broke into the warehouse and carried off whole pallets of finished vents. You can still hear them grunting as they drag the crates toward their hideout in the bog behind the old mill. If the vents sink into the mud, the order is in serious trouble. What does the guild do?"},
 fi:{t:"Kattopeikkojen ryöstöretki",n:"Kello kolmen aikaan yöllä varaston hälytin alkaa soida. Kattopeikot! Nämä harmaat, sammaleiset otukset asuvat vuotavien ja kosteiden kattojen alla, ja hyvin tuuletettu katto on niiden pahin painajainen. Kun ne kuulivat lohikäärmeen tilauksesta, ne murtautuivat varastoon ja veivät mukanaan kokonaisia lavoja valmiita tuulettimia. Niiden murinan kuulee yhä, kun ne kiskovat laatikoita kohti piilopaikkaansa vanhan myllyn takaisessa suossa. Jos tuulettimet uppoavat suohon, tilaus on vakavissa vaikeuksissa. Mitä kilta tekee?"},
 o:[
  {tag:'might',win:{g:30,v:4000,m:0},lose:{g:0,v:-1000,m:0},
   en:{t:"Charge into the bog after them",w:"The guild charges through the reeds with torches and battle cries. The trolls panic, drop the pallets and flee, leaving a few gold coins behind in the mud.",l:"The charge ends knee-deep in the bog. While the guild pulls each other out of the mud, the trolls sink a pallet just to make a point."},
   fi:{t:"Rynnäkkö suolle peikkojen perään",w:"Kilta ryntää kaislikon läpi soihtujen ja sotahuutojen kera. Peikot panikoivat, pudottavat lavat ja pakenevat jättäen mutaan muutaman kultakolikon.",l:"Rynnäkkö päättyy polvia myöten suohon. Sillä välin kun kilta kiskoo toisiaan ylös mudasta, peikot upottavat yhden lavan ihan periaatteesta."}},
  {tag:'scout',win:{g:0,v:4500,m:0},lose:{g:0,v:500,m:0},
   en:{t:"Track them and sneak the crates back",w:"Silent as a draught in a chimney, the rangers follow the mossy footprints and slip every crate out of the troll camp while the trolls argue about who gets the shiniest vent.",l:"The footprints lead in a big circle straight back to the forge's own coffee room. The trolls have a good laugh. Most of the crates are still in the bog."},
   fi:{t:"Jäljitä peikot ja hiivi laatikot takaisin",w:"Hiljaa kuin veto savupiipussa samoojat seuraavat sammaleisia jalanjälkiä ja livauttavat jokaisen laatikon pois peikkojen leiristä sillä aikaa, kun peikot riitelevät siitä, kuka saa kiiltävimmän tuulettimen.",l:"Jalanjäljet kiertävät ison ympyrän ja johtavat suoraan pajan omaan kahvihuoneeseen. Peikot nauravat makeasti. Suurin osa laatikoista on yhä suossa."}},
  {tag:'cunning',win:{g:40,v:3500,m:10},lose:{g:-50,v:0,m:0},
   en:{t:"Make the trolls a deal",w:"It turns out troll caves are damp too, and every troll suffers from terrible rheumatism. The guild trades the stolen pallets back for a free ventilation check of the troll caves. A brand new customer segment!",l:"The trolls out-negotiate us. We get the crates back, but now owe them gold and a monthly newsletter about damp roofs."},
   fi:{t:"Tee peikkojen kanssa diili",w:"Paljastuu, että peikkojen luolatkin ovat kosteita ja jokaisella peikolla on kamala reuma. Kilta vaihtaa varastetut lavat takaisin ilmaiseen tuuletustarkastukseen peikkoluolissa. Upouusi asiakassegmentti!",l:"Peikot neuvottelevat meidät nurkkaan. Saamme laatikot takaisin, mutta olemme nyt velkaa kultaa ja kuukausittaisen uutiskirjeen kosteista katoista."}}
 ]},
{dc:13,
 en:{t:"The Delivery",n:"The vents are packed and loaded. Between the forge and Emberbeard's lair lie the Misty Mountains, a rickety troll bridge with a very strict toll policy, and only three hours until dawn. The trucks are ready, the drivers are nervous, and the dragon has already sent two impatient smoke signals. How do we deliver?"},
 fi:{t:"Toimitus",n:"Tuulettimet on pakattu ja lastattu. Pajan ja Hiiliparran luolan välissä ovat Sumuvuoret, huojuva peikkosilta erittäin tiukalla tullipolitiikalla, ja aamunkoittoon on enää kolme tuntia. Rekat ovat valmiina, kuljettajat hermostuneita, ja lohikäärme on jo lähettänyt kaksi kärsimätöntä savumerkkiä. Miten toimitamme?"},
 o:[
  {tag:'scout',win:{g:0,v:2000,m:10},lose:{g:0,v:-2000,m:0},
   en:{t:"Fly with rented griffins",w:"The griffins land at the lair early. Emberbeard writes it down: supplier on time.",l:"The griffins spot a sheep farm. Several pallets are now somewhere over Sweden."},
   fi:{t:"Lennä vuokragriffoneilla",w:"Griffonit laskeutuvat luolalle etuajassa. Hiiliparta kirjaa: toimittaja täsmällinen.",l:"Griffonit huomaavat lammastilan. Useita lavoja on nyt jossain Ruotsin yllä."}},
  {tag:'might',win:{g:0,v:2500,m:0},lose:{g:-30,v:-1500,m:0},
   en:{t:"Convoy over the troll bridge",w:"The convoy rolls through. The bridge troll respects a firm handshake and waives the toll.",l:"The troll charges one vent per wheel. The convoy has a lot of wheels."},
   fi:{t:"Saattue peikkosillan yli",w:"Saattue jyrää läpi. Siltapeikko arvostaa jämäkkää kättelyä ja antaa tullin anteeksi.",l:"Peikko vaatii tullia yhden tuulettimen per pyörä. Saattueessa on paljon pyöriä."}},
  {tag:'arcane',win:{g:0,v:1500,m:15},lose:{g:0,v:-1000,m:-10},
   en:{t:"Open a portal straight into the lair",w:"Whoosh! The vents arrive in a neat stack and Emberbeard is delighted by the express service.",l:"The portal opens into the neighbouring dragon's lair. She is now a very happy VILPE customer. He is not."},
   fi:{t:"Avaa portaali suoraan luolaan",w:"Vuuh! Tuulettimet saapuvat siistissä pinossa, ja Hiiliparta ihastuu pikatoimitukseen.",l:"Portaali aukeaa naapurilohikäärmeen luolaan. Hän on nyt hyvin tyytyväinen VILPE-asiakas. Hiiliparta ei ole."}}
 ]},
{dc:14,
 en:{t:"The Final Inspection",n:"Dawn breaks over the Northern Peaks. Emberbeard circles his mountain slowly and inspects every vent with one enormous, glowing eye. Below, a nervous project manager clutches a checklist and tries to remember whether the warranty covers dragon fire. The whole guild holds its breath. One last chance to win him over."},
 fi:{t:"Lopputarkastus",n:"Aamu sarastaa Pohjoisvuorten yllä. Hiiliparta kiertää vuortaan hitaasti ja tarkastaa jokaisen tuulettimen yhdellä valtavalla, hehkuvalla silmällä. Alhaalla hermostunut projektipäällikkö puristaa tarkistuslistaa ja yrittää muistaa, kattaako takuu lohikäärmeen tulen. Koko kilta pidättää hengitystään. Viimeinen tilaisuus voittaa hänet puolelleen."},
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
 legendary:{en:{t:"Legend of the Vent Forge",n:"At sunrise Emberbeard lands on the forge roof, and for a long moment nobody breathes. Then he lowers his enormous head and inspects the work: ten thousand VILPE roof vents, every one level, sealed and breathing perfectly. The damp is gone, the green has faded from his gold, and for the first time in three hundred years his treasure smells of fresh mountain air. He pays double, signs a framework agreement for every dragon lair in the realm and asks whether the guild also does service contracts. Bards will sing of this night for generations, mostly about the roof vents. Somewhere a quality manager quietly marks the order: delivered to spec."},
            fi:{t:"Tuuletinpajan legenda",n:"Auringon noustessa Hiiliparta laskeutuu pajan katolle, eikä kukaan uskalla hengittää. Sitten hän laskee valtavan päänsä ja tarkastaa työn: kymmenentuhatta VILPE-kattotuuletinta, jokainen suorassa, tiivis ja täydellisesti hengittävä. Kosteus on poissa, vihreä on kadonnut kullasta, ja ensimmäistä kertaa kolmeensataan vuoteen aarre tuoksuu raikkaalta vuoristoilmalta. Hän maksaa tuplasti, allekirjoittaa puitesopimuksen valtakunnan jokaiseen lohikäärmeluolaan ja kysyy, tekeekö kilta myös huoltosopimuksia. Bardit laulavat tästä yöstä sukupolvien ajan, lähinnä kattotuulettimista. Jossain laatupäällikkö merkitsee hiljaa tilaukseen: toimitettu speksin mukaan."}},
 success:{en:{t:"Paid in Full",n:"Dawn finds all ten thousand vents in place. Emberbeard walks the length of his lair twice, sniffing suspiciously, but the air is dry and his gold has stopped turning green. He grumbles that the delivery note was smudged, then pays the invoice in full, with only light scorch marks on the corners. On his way out he asks for a brochure for a friend, a cousin down south with a mould problem. The guild staggers home to sleep for a week. Another satisfied customer for the Grand Vent Forge, and an order delivered to VILPE spec."},
          fi:{t:"Maksettu kokonaan",n:"Aamunkoitto löytää kaikki kymmenentuhatta tuuletinta paikoiltaan. Hiiliparta kävelee luolansa päästä päähän kahdesti ja nuuhkii epäluuloisesti, mutta ilma on kuiva ja kulta on lakannut vihertämästä. Hän murisee, että lähetysluettelo oli tuhriintunut, ja maksaa sitten laskun kokonaan, vain kulmista kevyesti kärventyneenä. Lähtiessään hän pyytää esitteen kaverille, etelässä asuvalle serkulle, jolla on homeongelma. Kilta raahautuu kotiin nukkumaan viikoksi. Jälleen yksi tyytyväinen asiakas Suurelle Tuuletinpajalle, ja tilaus toimitettu VILPE-speksin mukaan."}},
 short:{en:{t:"Almost to Spec",n:"When the sun rises, Emberbeard counts. Then he counts again. The vents that arrived are excellent, he admits, but a dragon knows exactly how many of anything he owns, and this is not ten thousand. One corner of the lair is still damp, and the gold there still smells faintly of sauna towel. He pays for what was delivered, keeps the deposit for the rest and books a follow-up delivery for next week, with a penalty clause written in fire. Not a disaster, but not VILPE spec either. The production manager is already drafting the root cause analysis."},
        fi:{t:"Melkein speksissä",n:"Auringon noustessa Hiiliparta laskee. Sitten hän laskee uudelleen. Perille tulleet tuulettimet ovat erinomaisia, hän myöntää, mutta lohikäärme tietää tarkalleen, montako mitäkin hän omistaa, eikä tämä ole kymmenentuhatta. Luolan yksi nurkka on yhä kostea, ja siellä kulta tuoksuu edelleen hieman saunapyyhkeeltä. Hän maksaa toimitetusta, pitää ennakkomaksun lopuista ja varaa täydennystoimituksen ensi viikolle, sopimussakko tulella kirjoitettuna. Ei katastrofi, mutta ei VILPE-speksiäkään. Tuotantopäällikkö kirjoittaa jo juurisyyanalyysiä."}},
 messy:{en:{t:"A Bit Singed",n:"Dawn comes, and so does the reckoning. Too few vents, too many surprises, and a dragon whose patience was thin to begin with. Emberbeard roars once, mostly for effect, and the loading dock loses its paint. He pays half, demands a five-year service contract and insists that the VILPE Sense crystal supervise every future delivery. The guild survives with slightly shorter eyebrows and a very long list of lessons learned. Not bad for one night's work. Not good either."},
        fi:{t:"Hieman kärventynyt",n:"Aamu koittaa, ja niin koittaa tilinteko. Liian vähän tuulettimia, liian monta yllätystä ja lohikäärme, jonka kärsivällisyys oli valmiiksi ohut. Hiiliparta karjaisee kerran, lähinnä tehokeinona, ja lastauslaiturista lähtee maali. Hän maksaa puolet, vaatii viiden vuoden huoltosopimuksen ja edellyttää, että VILPE Sense -kristalli valvoo jatkossa jokaista toimitusta. Kilta selviää hieman lyhyemmin kulmakarvoin ja hyvin pitkän opittujen asioiden listan kanssa. Ei paha yhden yön työksi. Ei kyllä hyväkään."}},
 disaster:{en:{t:"A Glorious Disaster",n:"The sun rises on a disaster. Half the order is missing, the trolls are still sitting on our pallets in the bog, and Emberbeard is not in the mood for excuses. He roasts the loading dock, the parking lot and, regrettably, the coffee machine. Luckily the forge is now extremely well ventilated, and the smoke clears in record time. When the embers have cooled, the guild gathers in the ashes and agrees on one thing: next year, production starts before midnight."},
           fi:{t:"Loistelias katastrofi",n:"Aurinko nousee katastrofin ylle. Puolet tilauksesta puuttuu, peikot istuvat yhä lavojemme päällä suossa, eikä Hiiliparta ole selitysten tuulella. Hän grillaa lastauslaiturin, parkkipaikan ja valitettavasti myös kahvinkeittimen. Onneksi paja on nyt erinomaisesti tuuletettu, ja savu poistuu ennätysajassa. Kun hiillos on jäähtynyt, kilta kokoontuu tuhkaan ja on yhtä mieltä yhdestä asiasta: ensi vuonna tuotanto aloitetaan ennen keskiyötä."}}
};
const T={
en:{title:"The Dragon's Order",sub:"A party adventure in the Grand Vent Forge of VILPE",run:"Run the game (big screen + DM)",join:"Join as a player",
 connecting:"Connecting to the guild hall…",noRoom:"Can't connect to the live game from here. Make sure you are signed in to claude.ai and opened the link the host shared with you.",
 yourName:"Your hero's name",namePh:"e.g. Sir Ventsalot",pickClass:"Pick your class",joinBtn:"Join the guild",bonusOn:"+3 on",
 waitDM:"Waiting for the Dungeon Master…",inLobby:"You're in the guild! Watch the big screen, the adventure starts soon.",change:"Change hero",
 listen:"Listen to the Dungeon Master…",voteNow:"Vote for the guild's plan",voted:"Vote cast. You can still change it.",yourBonus:"+3 for you!",
 rollNow:"Roll for the guild!",tapRoll:"Tap the die",chosen:"The guild chose",rolled:"Your roll",bonus:"class bonus",nat20:"NATURAL 20! Legendary!",nat1:"NATURAL 1… the dragon saw that.",
 waitReveal:"Waiting for the DM to reveal the guild's fate…",groupAvg:"Guild average",dc:"Difficulty",
 tier_legendary:"Legendary success!",tier_success:"Success",tier_partial:"Partial success",partialNote:"Below the difficulty, but close: the plan only partly works. Reduced rewards.",tier_fail:"Failure",
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
 tagHelp:"Bonus classes",endStats:"Delivered",ofOrder:"of 10,000 vents",reconnecting:"Reconnecting…",inRoom:"connected",waking:"Waking up the forge… (can take up to a minute)",hostKeyBad:"Wrong DM key. Open the DM link with the correct ?key=",joinUrl:"or open",onlineN:"online",kick:"Remove"},
fi:{title:"Lohikäärmeen tilaus",sub:"Juhla-seikkailu VILPEn Suuressa Tuuletinpajassa",run:"Pyöritä peliä (iso näyttö + pelinjohtaja)",join:"Liity pelaajaksi",
 connecting:"Yhdistetään kiltasaliin…",noRoom:"Live-peliin ei saada yhteyttä täältä. Varmista, että olet kirjautunut claude.ai:hin ja avasit linkin, jonka pelinjohtaja jakoi.",
 yourName:"Sankarisi nimi",namePh:"esim. Herra Tuuletin",pickClass:"Valitse hahmoluokka",joinBtn:"Liity kiltaan",bonusOn:"+3:",
 waitDM:"Odotetaan pelinjohtajaa…",inLobby:"Olet killassa! Seuraa isoa näyttöä, seikkailu alkaa pian.",change:"Vaihda sankari",
 listen:"Kuuntele pelinjohtajaa…",voteNow:"Äänestä killan suunnitelmaa",voted:"Ääni annettu. Voit vielä vaihtaa.",yourBonus:"+3 sinulle!",
 rollNow:"Heitä killan puolesta!",tapRoll:"Napauta noppaa",chosen:"Kilta valitsi",rolled:"Heittosi",bonus:"luokkabonus",nat20:"LUONNOLLINEN 20! Legendaarista!",nat1:"LUONNOLLINEN 1… lohikäärme näki tuon.",
 waitReveal:"Odotetaan, että pelinjohtaja paljastaa killan kohtalon…",groupAvg:"Killan keskiarvo",dc:"Vaikeus",
 tier_legendary:"Legendaarinen onnistuminen!",tier_success:"Onnistui",tier_partial:"Osittainen onnistuminen",partialNote:"Vaikeuden alle, mutta lähellä: suunnitelma onnistuu vain osittain. Pienemmät palkinnot.",tier_fail:"Epäonnistui",
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
 tagHelp:"Bonusluokat",endStats:"Toimitettu",ofOrder:"/ 10 000 tuuletinta",reconnecting:"Yhdistetään uudelleen…",inRoom:"yhteydessä",waking:"Herätellään pajaa… (voi kestää minuutin)",hostKeyBad:"Väärä pelinjohtajan avain. Avaa DM-linkki oikealla ?key=-arvolla",joinUrl:"tai avaa",onlineN:"paikalla",kick:"Poista"}
};


const cls=id=>CLASSES.find(c=>c.id===id);
const d20=()=>1+Math.floor(Math.random()*20);
const rollTotal=(r,clsId,tag)=>r===1?0:r+(cls(clsId)&&cls(clsId).tag===tag?3:0)+(r===20?5:0);
const tierOf=(avg,dc)=>avg>=dc+5?'legendary':avg>=dc?'success':avg>=dc-3?'partial':'fail';
const GAME={CLASSES,TAGS,SCENES,ENDINGS,T,cls,d20,rollTotal,tierOf};
if(typeof module!=='undefined'&&module.exports)module.exports=GAME;else root.GAME=GAME;
})(this);
