# knockout-erat
Knockout alkuerien luonti online-tulosten perusteella

Ohjelma pyörii selaimessa, ja hakee tulokset online4.tulospalvelu.fi -sivustolta halutun sarjan K1 ja K2 -sarjoista ja koostaa niistä Knockoutin SM 2023 ohjeissa kuvatun säännön mukaan alkuerät.

Ohjelma olettaa samassa kansiossa olevan Irmasta ladatut ranki-csv:t nimellä ranki<sarja>.csv.

Halutut sarjat täytyy päivittää index.html-tiedostoon käsin, ja oikea kilpailutunnus js.js-tiedoston alkuun.

corsproxy.php toimii välityspalveluna online-tiedoille, CORS-estojen kiertämiseksi selaimessa. Vaihtoehtoisesti selaimeen voi asentaa CORS unblock (tai vast.) lisäosan, jolloin online_domain -määrityksestä voi jättää alun pois ja käyttää ohjelmaa paikallisesti ilman PHP-palvelinta.