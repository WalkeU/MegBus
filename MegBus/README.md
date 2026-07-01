# MegBus

Mobilalkalmazás a "Buszozás" (Ride the Bus) nevű kártyajátékhoz. Egy host szobát hoz létre,
a többiek szobakóddal csatlakoznak, és az app vezeti végig a kört valós időben, közös eszközök
nélkül (mindenki a saját telefonján látja a saját lapjait és a tippelési lehetőségeket).

## Státusz

- **Backend** (`backend/`): a teljes játéklogika (lapgenerálás, 1-4. kör, piramis,
  négykérdéses buszozás), szoba- és ready-kezelés, valamint a Socket.IO/Express szerver
  el van készítve és tesztelve (58 zöld unit + integrációs teszt, lásd lentebb).
  A Prisma séma vázolva van, de élő adatbázis-kapcsolat nélkül.
- **iOS kliens** (`MegBus/`): SwiftUI/MVVM alkalmazás a teljes UX-folyammal (lobby, 1-4. kör,
  piramis, buszozás, játék vége), sötét témával. Hálózati réteg `GameConnection` protokoll
  mögé van szervezve: `MockGameConnection` előnézethez/helyi futtatáshoz készen áll,
  `SocketIOGameConnection` a valódi szerverhez köt, de ehhez Xcode-ban hozzá kell adni a
  `socket.io-client-swift` Swift Package-et (File > Add Package Dependencies). Ez a környezet
  nem tartalmaz teljes Xcode-ot, így a kliens build/futtatás itt nem volt ellenőrizhető —
  a Swift fájlok szintaktikailag és (macOS SDK-val helyettesítve) típushelyesen ellenőrizve
  lettek, de a tényleges Xcode build/futtatás a fejlesztő gépén még hátravan.

### Backend futtatása

```
cd backend
npm install
npm run dev        # fejlesztői szerver (tsx watch)
npm test           # 58 unit + integrációs teszt
npm run build       # production build (dist/)
```

### iOS kliens megnyitása

Nyisd meg a `MegBus.xcodeproj`-t Xcode-ban. A `MockGameConnection` alapértelmezetten be van
kötve (`ContentView.swift`), így UI-szinten futtatható/előnézetezhető szerver nélkül is.
Valódi szerverhez kötéshez add hozzá a `socket.io-client-swift` package-et, majd cseréld
a `ContentView` `GameViewModel`-jét `SocketIOGameConnection(serverURL:)`-re.

## Játékszabályok

A "Buszozás" szabályai tájegységenként eltérhetnek; az alábbi a legelterjedtebb magyar verzió,
ez az app referenciaszabálykönyve.

### Szükséges

- 1 db 52 lapos francia kártyapakli (joker nélkül)
- 2 vagy több játékos

### 1-4. kör büntetése

Az 1-4. körben jó tipp esetén **nem történik semmi** (sem büntetés, sem kiosztás — a
játékos egyszerűen továbblép). Rossz tipp esetén a játékos maga iszik, és a korty
mennyisége megegyezik a kör sorszámával:

| Kör | Kérdés | Rossz tipp büntetése |
| --- | --- | --- |
| 1. | Piros vagy fekete? | 1 korty |
| 2. | Nagyobb vagy kisebb? | 2 korty |
| 3. | Közte vagy kívül? | 3 korty |
| 4. | Milyen szín? | 4 korty |

A büntetést a játékos egy gombnyomással nyugtázza ("megittam") — nincs kiosztás
másoknak ebben a szakaszban.

### 1. kör — Piros vagy fekete?

Minden játékos kap 1 lapot, kiosztás előtt tippel: piros vagy fekete.

### 2. kör — Nagyobb vagy kisebb?

Mindenki kap egy második lapot, és megtippeli, hogy az nagyobb vagy kisebb lesz-e az elsőnél.

- Ász a legnagyobb, kettes a legkisebb.
- Az appban a második lap soha nem lehet azonos értékű az elsővel, így nincs döntetlen eset.

### 3. kör — Közte vagy kívül?

Mindenki kap egy harmadik lapot, és megtippeli, hogy az értéke az első két lap közé esik-e
(közte), vagy azokon kívül van (kívül).

Példa: 5 és J esetén a 6–10 közte, a 2–4 és a Q–Ász kívül számít.

Az appban a harmadik lap soha nem lehet azonos értékű sem az elsővel, sem a másodikkal —
tehát olyan lap sem jöhet ki, ami pontosan a határon van. Emiatt a "közte vagy kívül"
döntés mindig egyértelmű, nincs szükség külön határeset-szabályra.

### 4. kör — Milyen szín?

Mindenki kap egy negyedik lapot, és megtippeli a négy szín egyikét: kőr, káró, treff, pikk.

### 5. kör — Piramis

Az osztó 15 lapból piramist rak ki (5-4-3-2-1 lap soronként, alulról felfelé fordítva):

```
        1
      2 2
    3 3 3
  4 4 4 4
5 5 5 5 5
```

Ha valakinél van a felfordított lap értékével megegyező lap, lerakhatja, és kijelölhet
valakit, aki megissza a sor értékét. A leggyakoribb értékek: alsó sor = 1 korty,
felette = 2, középső = 3, következő = 4, csúcs = 5. A lerakott lapok kikerülnek a játékból.

Az appban a rendszer **nem jelzi automatikusan**, ha valakinek egyező lapja van — ez
szándékos: a játékosnak saját magának kell észrevennie a nála lévő lapok alapján, és
kezdeményeznie a lerakást. Amíg valaki éppen a lerakás mellett dönt (kiválasztja, kinek
adja a büntetést), a piramis fordítása megáll, és csak azután folytatódik, hogy döntött
vagy meggondolta magát.

### 6. kör — Buszozás

Akinél a piramis végén a legtöbb lap maradt, annak kell "buszoznia" (döntetlen esetén
újabb húzással dől el, ki buszozik).

Az app a négykérdéses házi szabályváltozatot valósítja meg: a buszozó játékosnak minden
lépésnél végig kell csinálnia a teljes négykérdéses sort, ugyanazokkal a szabályokkal,
mint az 1–4. körben:

1. Piros vagy fekete?
2. Nagyobb vagy kisebb? (az előzőleg felfedett laphoz képest)
3. Közte vagy kívül?
4. Milyen szín?

Ha mind a négy kérdésre hibátlanul válaszol, kiszáll a buszból — ezzel véget ér a kör.
Ha bármelyik kérdésnél hibázik, megissza a büntetést, és visszamegy az első kérdéshez,
elölről kezdve a sort.

A buszozó a saját kijelzőjén az aktuális próbálkozás eddig felfordult összes lapját látja
(nem csak a legutolsót), így nyomon tudja követni, hol tart. Emellett látja azt is, hány
lap maradt még a buszozáshoz használt paklinál.

### Egyenlőségek kezelése (design döntés)

Mivel ez egy digitális alkalmazás, a lapgenerálásba bele van hardkódolva, hogy releváns
lapok soha nem lehetnek egyenlőek:

- 2. kör: a második lap nem lehet azonos értékű az elsővel.
- 3. kör: a harmadik lap nem lehet azonos értékű sem az elsővel, sem a másodikkal.

Ezzel kiküszöbölhető a hagyományos, asztal melletti játékoknál felmerülő egyenlőségi
vitás helyzetek kezelése (újrahúzás vs. automatikus hiba vs. "ugyanakkora" válaszlehetőség).

## Játékmenet az appban

Ez a szekció azt írja le, hogyan zajlik a játék a kliens nézőpontjából (UX-folyamat),
a fenti szabályokra építve.

### Szoba indítása

- A host létrehozza a szobát, a többiek szobakóddal csatlakoznak.
- Minden résztvevőnek "Ready" állapotba kell kerülnie.
- Amint mindenki ready, a játék automatikusan elindul.

### 1–4. kör (Piros/fekete, Nagyobb/kisebb, Közte/kívül, Milyen szín)

- Egyszerre mindig csak egy játékos van soron (aktív játékos).
- A többiek kijelzőjén csak az aktív játékos neve látszik, amíg ő tippel.
- Ha az aktív játékos végzett, a soron lévő automatikusan a következő játékosra vált,
  amíg az adott kör mindenkin végig nem ment.
- Ha egy kör mindenkin végigment, a következő kör automatikusan elindul (1. → 2. → 3. → 4.).
- Tippelés eredménye:
  - Jó tipp: nem történik semmi, a soron következő játékosé a tipp.
  - Rossz tipp: a játékos egy gombnyomással nyugtázza, hogy megitta a kör sorszámával
    megegyező mennyiségű kortyot (1/2/3/4).

### 5. kör — Piramis

- Minden játékos folyamatosan látja a saját lapjait, alul, a kijelző alján.
- A piramis lapjai sorrendben, automatikusan fordulnak fel, 5 másodpercenként egy.
- A rendszer nem jelzi ki, kinek van egyező lapja — a játékosnak a saját lapjai alapján
  kell észrevennie, és rákoppintania az egyező lapra a saját kezében.
- Amint valaki rákoppint egy lapra, hogy lerakja, a piramis fordítása megáll, amíg ő
  kiválasztja, kinek vagy kiknek osztja ki a büntetést (nem kötelező egy emberre adnia,
  megosztható), vagy meggondolja magát. Ezután a fordítás folytatódik.

### 6. kör — Buszozás

- A piramis végén a legtöbb ki nem rakott lappal rendelkező játékos buszozik.
- Buszozás közben mindenki kijelzőjén a buszozó játékos neve látszik.
- A buszozó a saját kijelzőjén látja az aktuális próbálkozás összes eddig felfordult
  lapját, és a buszozáshoz használt pakli hátralévő lapszámát is.

### Játék vége

- A buszozás lezárása után a játéknak vége.
- A játékosok választhatnak: kilépés a szobából, vagy új kör indítása.

## Megjelenés (UI/UX koncepció)

- Modern, letisztult, minimalista design.
- Sötét téma: fekete / nagyon sötét háttér alapértelmezettként.
- Intuitív, könnyen kezelhető felület — kevés lépés, nagy és egyértelmű kezelőelemek.
- Egységes vizuális nyelv az egész alkalmazásban (kártyák, gombok, animációk azonos stílusban).

## Fejlesztési alapelvek

- A fejlesztés minden rétegében (frontend, backend, adatbázis) best practice-ek
  alkalmazandók. Ezeket itt külön nem soroljuk fel tételesen, de elvárás, hogy
  mindenhol érvényesüljenek.

## Tervezett architektúra

### Kliens (iOS)

- SwiftUI
- MVVM

### Backend

- Node.js + TypeScript
- Express.js
- Socket.IO — valós idejű kommunikáció a szobán belüli játékosok között

### Adattárolás

- PostgreSQL + Prisma ORM — perzisztens adatok
- Redis — szobák, játékállapot, reconnect kezelés, sessionök

### Authentikáció

Nincs klasszikus regisztráció, csak:

- játékos neve
- 6 karakteres szobakód
- ideiglenes session

### Szoba-folyamat

```
Host
 │
 ▼
Create Room
 │
 ▼
ABC123 (szobakód)
 │
 ├───────────────┐
 ▼               ▼
Player 1      Player 2
Join Room     Join Room
 │               │
 └──── Socket.IO ────┘
```
