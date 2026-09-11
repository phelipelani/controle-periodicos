const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./src/db');

const csvData = `1;Cond. do Conj. Hab. Azul Marinho;WAGNER;AV PREF. GERALDO NOGUEIRA DA SILVA, 990
2;Cond Edif. San Francisco;DAIANE;RUA ANA FRANCISCA FACHINI, 220
3;Cond. Edif. Itamambuca;ARMANDO;RUA SADY GOMES DE ALMEIDA, 500
4;Cond. Barramares;PHELIPE;AV DR ALDINO SCHIAVI, 777
5;Cond. Vila Martins;DAIANE;RUA ITÁLIA BAFFI MAGNI, 105
6;Cond. Petra;ANA;AV. PAULO FERRAZ DA SILVA PORTO, 820
7;Cond. Edif. Nova Era;WAGNER;AVENIDA FIORAVANTE PASCHOALIM, 47
8;Cond. Edif. Gaivota;PHELIPE;AV. FREI PACIFICO WAGNER , 580
9;Cond. Camburi;DAIANE;RUA ÁGUAS DE SÃO PEDRO, 390
10;Cond. Edif. Barão de Iguape;WAGNER;PCA JOSE RABELLO DA CUNHA, 30
11;Cond. Edif. Sierra Nevada;PHELIPE;RUA ANA FRANCISCA FACHINI , 235
12;Cond. Edificio Itamaraca;ARMANDO;RUA PREF. SILVIO L. SANTOS , 85
13;Cond. Conj. Jardim do Sol;PHELIPE;AV DOMINGOS MARTINS CABRERA, 27
14;Cond. Sunset Boulevard;ARMANDO;RUA FRANCISCO NUNES MARTINHO D´ECA, 399
15;Cond. Ravena;ARMANDO;AV. GASPAR DE SOUZA, 235
16;Cond. Santa Madalena;ARMANDO;RUA BARTOLOMEU BUENO DA SILVA, 1090
17;Cond. do Conj. Res. São José;ARMANDO;RUA PINDAMONHANGABA, 177
18;Cond. Edif. Sol e Mar;ARMANDO;AV. ANCHIETA, 836
19;Cond. Edif. Sumaré;PHELIPE;AV.  DR. LUCAS NOGUEIRA GARCEZ, 255
20;Cond. Resid. Costa do Sol;PHELIPE;RUA DAS AZALÉIAS, 199
21;Cond. Marina I e II;ARMANDO;RUA 9, 520
22;Cond. Edif. Res. Natalie;ANA;RUA LINDÓIA, 48
23;Cond. Araras;PHELIPE;PC JOSE RABELLO DA CUNHA, 173
24;Cond. Edif. Barão de Bocaina;ARMANDO;AV ANCHIETA, 191
25;Cond. do Edif. Maranatha;DAIANE;AV. IRINEU MENDES DE SOUZA, ,1195
26;Cond. Andaluzia;ARMANDO;RUA FERNÃO DIAS PAES LEME, 300
27;Condomínio Resid. Sea Green Residence II;DAIANE;RUA DO OURO, 86
28;Cond. Belvedere dos Bandeirantes;ARMANDO;RUA ANTONIO RAPOSO TAVARES, 201
29;Cond. Residencial Aquarius II;WAGNER;AV. MARGINAL, 265
30;Cond. Edif. Barbará;DAIANE;RUA DOM JERONIMO DE ATAIDE, 390
31;Cond. Edif. Jangada Flat Service;DAIANE;AV. DR. ARTHUR DA COSTA FILHO, 751
32;Cond. Edif. Mar Azul;ANA;AV. DR. ARTHUR COSTA FILHO, 585
33;Cond. Napoli;ANA;RUA ANA FRANCISCA FACHINI, 185
34;Cond. Vista massaguaçu;WAGNER;RUA ENNIO ANGELO BERTONCINI, 65
35;Cond. do Edif. Sol do Indaiá;WAGNER;AV. SÃO PAULO, 811
36;Cond. Edif. Costa Norte;ANA;AV. PAVÃO, 14
37;Cond. Veneza;WAGNER;AV. IRINEU MENDES DE SOUZA, 1385
38;Cond. Horiz. Serra e Mar II;DAIANE;AV JOSÉ JERISSATI, 68
39;Cond. Edif. Caraguá;ARMANDO;AV. IVAN MICHELETTO ROSSI, 97
40;Condomínio Villa dos Ingleses;DAIANE;RUA PRESIDENTE WASHINGTON LUIZ, 44
41;Cond. Sitio Caminho do Forno;WAGNER;RUA CAMINHO DO FORNO, 1111
42;Cond. Costa Brava;WAGNER;RUA JACARANDA , 498
43;Cond. Edif. Pontal da Cruz;DAIANE;AV DOUTOR MANOEL HIPOLITO DO REGO,1352
44;Cond. Villas Rio do Ouro;WAGNER;R BENEDITO MIGUEL DA COSTA, 693
45;Cond. Villa iluminata;PHELIPE;AV. 23 DE MAIO  / ATUAL AV. NILO BRAGA G, 305
46;Cond. Villagio Itapoã;PHELIPE;RUA ITAPOÃ, 420
47;Cond. Res. Pérola;ANA;AV. DR. ARTHUR COSTA FILHO, 1477
48;Cond. Res. Bandeirantes;DAIANE;AV. IRINEU MENDES DE SOUZA, 1051
49;Cond. Horiz. Urupema;WAGNER;AV. PAULO FERRAZ DA SILVA PORTO, 997
50;Cond. São Francisco;ARMANDO;AV. PREF. GERALDO NOGUEIRA DA SILVA, 2534
51;Cond. Res. San Francisco;DAIANE;RUA VITOR MEIRELLES, 825
52;Cond. Horiz. Recanto das Flores;ARMANDO;RUA QUINZE, 44
53;Cond. Vista Verde;WAGNER;RUA XINGU, 50
54;Cond. Horiz. Famboyant;PHELIPE;AV. MARTIN DE SA, 600
55;Cond. do Edif. Suíte Mediterrane;PHELIPE;RUA SANTA CRUZ, 197
56;Cond. Edif. Res. Maranduba;WAGNER;AV MARANDUBA, 484
57;Cond. Bahamas;DAIANE;Rua Prof. Adaly Coelho Passos, 444
58;Cond. Residencial Prime View;ANA;AV. PREF. GERALDO NOGUEIRA DA SILVA, 1890
59;Cond. do Edif. Oliveira Sanches;ARMANDO;RUA QUELUZ, 5
60;Condomínio Torremolinos;ANA;RUA PEDRO CARVALHO, 204
61;Cond. do Edif. Caraguatás;WAGNER;RUA DONA SOFIA, 11
62;Cond. Edif. Verde Mar;ANA;AV. GENERAL OZORIO, 55
63;Cond. do Edifício Morada do Sol;ANA;RUA BENEDITO ZACARIAS AROUCA, 630
64;Condomínio Resid. Ilha de Córsega;ANA;RUA IPÊ, 240
65;Cond. Center Office;WAGNER;AVENIDA PERNAMBUCO, 195
66;Cond. Novo Mundo;WAGNER;R ALMIRANTE NOGUEIRA, 27
67;Cond. jangadeiro;PHELIPE;AVENIDA MIGUEL VARLEZ, 957
68;Cond. Jangadeiro segundo;WAGNER;RUA VEREADOR ANTÔNIO CRUZ AROUCA, 66
69;Cond. Recanto dos Canarios;WAGNER;ALAMEDA FRANCISCO DE ASSIS ROSA SILVA, 574
70;Cond. Prainha;PHELIPE;RUA  PROF. ADALY COELHO PASSOS,380
71;Cond. Edif. Marissol;DAIANE;AV. HORACIO RODRIGUES, 20
72;Cond. Edif. Solar dos Indaiás;ARMANDO;AV. PREF. GERALDO NOGUEIRA DA SILVA, 1660
73;Cond. Edif. Costa Ligure;WAGNER;RUA PATY, 165
74;Cond. Arpoador;WAGNER;AV. DR. ALDINO SCHIAVI, 113
75;Cond. Britania Mar II;DAIANE;RUA UM, 930
76;Cond. Sardenha;PHELIPE;RUA HORTÊNCIA PINTO NORONHA, 125
77;Cond. do Edif. Horizonte Azul I;WAGNER;AV. PREF. GERALDO NOGUEIRA DA SILVA, 2098
78;Cond. Res. Atol das Rocas;PHELIPE;AV. YVONE YONEKA NAKANISHI, 80
79;Cond. San Rafael;DAIANE;AV. PREF. GERALDO NOGUEIRA DA SILVA, 2610
80;Cond. do Edif. Barlavento;WAGNER;RUA ANTONIO ROBERTO ALMEIDA, 15
81;Cond. Resid Aquarius;ANA;AVENIDA SIQUEIRA CAMPOS, 1192
82;Cond. Le Sape;ANA;RUA MARGINAL A, 281
83;Cond. Resid. Estrela do Mar;WAGNER;Av. Joaquina Engracia Soares Tidioli, 137
84;Cond. Villagio Porto fino;ARMANDO;ROD SP-55, 2400
85;Assoc. Jardim das Flores (Orquidea);ANA;EST MUNICIPAL SERTAO DA QUINA, 1010
86;Cond. Via Del mare;WAGNER;AV. PREF. GERALDO NOGUEIRA DA SILVA, 150
87;Cond. Porto Paraiba;WAGNER;RUA GUARULHOS, 55
88;Cond. Cynira;ARMANDO;RUA DOM JERONIMO DE ATAIDE, 365
89;Cond. Horiz. Praia das Flecheiras;DAIANE;ALAMEDA COSME RANGEL, 450
90;Cond. Maranatha II;PRISCILA;RUA NITERÓI, 270
91;Cond. Belvedere das Palmeiras;ARMANDO;RUA ANTONIO RODRIGUES ARZÃO, 30
92;Cond. Edif. Marseille;DAIANE;AV. MINAS GERAIS, 1505
93;Condomínio Edifício Riviera;PHELIPE;AVENIDA DOUTOR ALDINO SCHIAVI, 367
94;Cond. do Edif. Solar das Cocanhas;PHELIPE;RUA GERALDO ESTEVAM DE MATOS, 35
95;Cond. Edif. D'Evora;WAGNER;RUA FRANCISCO N. MARTINHO D ECA, 45
96;Cond. Horizontal Marujo II;PHELIPE;RUA DOM JERÔNIMO DE ATAIDE, 655
97;Cond. Res. Vert. Britania;DAIANE;AV. MIRAMAR, 3
98;Cond. do Edif.Horizonte Azul;ANA;AV. PREF. GERALDO NOGUEIRA DA SILVA, 1670
99;Cond. Atlantic Inn Martin de As II;ARMANDO;RUA NILO BRAGA GARCEZ, 580
100;Cond. Pontal da Cruz;DAIANE;RUA FRANCELIZIO OLIVEIRA COELHO FILHO, 76
101;Cond. Residencial Suite Jangada;PHELIPE;PRAÇA DR. DIOGENES RIBEIRO DE LIMA, 55
102;Cond. Mirante da Ilha;ANA;AV. PREF. GERALDO NOGUEIRA DA SILVA, 2240
103;Cond. Yatch Club Flat Martin de Sá;PHELIPE;RUA JACARANDÁ, 164
104;Cond. Porto Caragua;DAIANE;RUA BARTOLOMEU BUENO DA SILVA, 305
105;Cond. Edif. Madrid II;WAGNER;AV. VICTOR MEIRELLES, 433
106;Cond. Morada do Martin;DAIANE;TRAVESSA AGUEDA LOPES RUIZ, 80
107;Cond. Horizontal Costa Azul;PHELIPE;RUA BARTOLOMEU BUENO DA SILVA, 70
108;Cond. San Siro;WAGNER;AV IVO GONÇALVES RELVA, 1270
109;Cond. Vila Moura;ANA;AV. PREF. GERALDO NOGUEIRA DA SILVA, 2222
110;Condomínio Via Mar;PHELIPE;AVENIDA MAESTRO HEITOR DE CARVALHO, 414
111;Cond. Edif. Sierra Morena;ARMANDO;AV. NILO BRAGA GARCEZ, 70
112;Cond. Atlantic Inn  - Prainha 1;ANA;RUA JOSÉ VIEIRA DA MOTA, 507
113;Cond. Horiz. Logus;ANA;RUA VICTOR MEIRELLES, 400
114;Cond. Aloha;WAGNER;RUA SEBASTIÃO ROMÃO CESAR, 390
115;Cond. Atlantic Inn Indaiá 1;ARMANDO;RUA AFONSO PENA, 101
116;Cond. Vilage Fagundes;PHELIPE;RUA CÂNDIDA DOS PRAZERES DE MOURA, 141
117;Cond. Edif. Samambaia;PHELIPE;RUA SEBASTIÃO MARIANO NEPOMUCENO, 541
118;Cond. Mirante da Orla;ARMANDO;RUA ANNA ZAMARZAHI Y CARNERO, 731
119;Cond. do Edif. San Martin;ANA;AV. ALDINO SCHIAVI, 333
120;Cond. do Edif. Saveiro;ANA;AV. MARGINAL, 50
121;Cond. do Edif.Resid. Tabaporã;ARMANDO;RUA BENEDITO VICENTE DOS SANTOS, 90
122;Cond. Atlantico Imperial;DAIANE;AV. PREF. GERALDO NOGUEIRA DA SILVA, 2250
123;Cond. Marajó;PHELIPE;AV PROF ADALY COELHO PASSO, 763
124;Cond. Resid. Spazio Del Mare;ANA;AV TSUZUKI YOSHIMOTO, 531
125;Cond. da Galeria Jangada;PHELIPE;PRAÇA DIOGENES RIBEIRO DE LIMA, 67
126;Cond. Villagio Dall Costa;ARMANDO;AV. HORACIO RODRIGUES, 533
127;Cond. Residencial Florença;ANA;AV. ARISTIDES ANIZIO DOS SANTOS, 70
128;Condomínio Prestes Maia;ARMANDO;AVENIDA PRESTES MAIA, 56
129;Cond. N. S. Aparecida;ANA;RUA BRAGANÇA PAULISTA, 165
130;Condomínio Edif. Pajuçara;ANA;AV NILO BRAGA GARCEZ, 89
131;Condomínio Valência;DAIANE;AVENIDA PREFEITO GERALDO NOGUEIRA DA SIL, 1498
132;Cond. Perolas do Mar;ANA;RUA ALMIRANTE TAMANDARE, 40
133;Cond. Tropical Center;WAGNER;AV DOUTOR FRANCISCO LOUP, 1170
136;Cond. Villagio Hawai;ANA;AV SIDNEI DE OLIVEIRA ANDRADE, 721
139;Cond. Brisa do Mar;DAIANE;Rua Um,35`;

const lines = csvData.trim().split('\n');
const stmt = db.prepare('UPDATE condominios SET endereco = ? WHERE id = ?');

let updated = 0;
for (const line of lines) {
  const parts = line.split(';');
  if (parts.length >= 4) {
    const id = parseInt(parts[0].trim(), 10);
    const endereco = parts[3].trim();
    if (id && endereco) {
      stmt.run(endereco, id);
      updated++;
    }
  }
}

console.log(`Endereços atualizados com sucesso para ${updated} condomínios!`);
