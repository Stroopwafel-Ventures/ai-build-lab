/**
 * Name banks for fictional people.
 *
 * Names are drawn per "region" so first and last names usually belong
 * together (a Dutch first name with a Dutch surname), with a share of
 * mixed combinations because real teams in Amsterdam are mixed.
 * Every combination is random: none of these people exist.
 */
import type { Rng } from "./rng";

interface NameRegion {
  key: string;
  weight: number;
  first: string[];
  last: string[];
  cities: string[];
}

export const NAME_REGIONS: NameRegion[] = [
  {
    key: "nl", weight: 26,
    first: ["Daan", "Sanne", "Joris", "Floor", "Thijs", "Lotte", "Bram", "Iris", "Jeroen", "Femke", "Ruben", "Noor", "Wouter", "Marloes", "Sven", "Eline", "Gijs", "Anouk", "Stijn", "Maaike", "Pieter", "Roos", "Koen", "Merel", "Hidde", "Fleur", "Jasper", "Esmee", "Niels", "Lieke", "Tijmen", "Willemijn", "Maarten", "Jikke", "Olivier", "Annelies", "Teun", "Mirjam", "Lars", "Charlotte"],
    last: ["de Wit", "Veldhuis", "Brouwer", "Kuipers", "van Leeuwen", "Hoekstra", "Smits", "van der Linde", "Postma", "Vermeulen", "Dekker", "Mulder", "Jansma", "Bosman", "Verhoeven", "van Rijn", "Kramer", "Schouten", "de Graaf", "Wijnands", "Timmerman", "van Dam", "Koster", "Prins", "Huisman", "Zwart", "Bakker", "Hendriks", "Veenstra", "Meijer", "Lammers", "Terpstra", "van Aken", "Oosterhuis", "Brinkman", "Groenewegen", "Nijhof", "Dijkhuizen", "Ruiter", "Haverkamp"],
    cities: ["Amsterdam", "Amsterdam", "Amsterdam", "Rotterdam", "Utrecht", "The Hague", "Eindhoven", "Haarlem", "Delft", "Groningen"],
  },
  {
    key: "de", weight: 12,
    first: ["Jonas", "Lena", "Felix", "Hannah", "Moritz", "Clara", "Lukas", "Johanna", "Tobias", "Miriam", "Niklas", "Katharina", "Florian", "Anja", "Matthias", "Svenja", "Benedikt", "Theresa", "Julian", "Franziska"],
    last: ["Hartmann", "Becker", "Krüger", "Vogel", "Lehmann", "Schuster", "Brandt", "Zimmermann", "Hoffmann", "Wendt", "Kessler", "Albrecht", "Lindner", "Pohl", "Seidel", "Engel", "Fuchs", "Möller", "Winkler", "Hahn"],
    cities: ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt", "Vienna", "Zurich"],
  },
  {
    key: "fr", weight: 8,
    first: ["Camille", "Antoine", "Chloé", "Mathieu", "Léa", "Julien", "Manon", "Hugo", "Élise", "Baptiste", "Inès", "Romain", "Margaux", "Théo"],
    last: ["Lefèvre", "Moreau", "Girard", "Rousseau", "Fontaine", "Chevalier", "Mercier", "Lambert", "Bonnet", "Faure", "Garnier", "Perrin", "Morel", "Dupuis"],
    cities: ["Paris", "Lyon", "Brussels", "Antwerp", "Ghent", "Lille"],
  },
  {
    key: "es", weight: 7,
    first: ["Lucía", "Javier", "Marta", "Pablo", "Elena", "Diego", "Carmen", "Álvaro", "Nuria", "Sergio", "Irene", "Andrés"],
    last: ["Navarro", "Ortega", "Delgado", "Castillo", "Romero", "Iglesias", "Serrano", "Molina", "Herrera", "Vidal", "Campos", "Prieto"],
    cities: ["Madrid", "Barcelona", "Valencia", "Lisbon"],
  },
  {
    key: "it", weight: 6,
    first: ["Giulia", "Marco", "Francesca", "Luca", "Chiara", "Matteo", "Alessia", "Davide", "Sara", "Federico"],
    last: ["Bianchi", "Ferraro", "Galli", "Conti", "Marchetti", "Rinaldi", "Moretti", "Barbieri", "Fontana", "Caruso"],
    cities: ["Milan", "Turin", "Bologna", "Rome"],
  },
  {
    key: "nordic", weight: 8,
    first: ["Astrid", "Mikkel", "Freja", "Oskar", "Ingrid", "Henrik", "Sigrid", "Emil", "Maja", "Anders", "Linnea", "Rasmus", "Elin", "Viktor"],
    last: ["Lindqvist", "Halvorsen", "Nyström", "Christensen", "Berglund", "Mikkelsen", "Sandberg", "Aaltonen", "Holm", "Dahl", "Ekström", "Virtanen", "Søndergaard", "Lund"],
    cities: ["Copenhagen", "Stockholm", "Oslo", "Helsinki", "Aarhus"],
  },
  {
    key: "pl_cee", weight: 8,
    first: ["Katarzyna", "Piotr", "Agnieszka", "Michał", "Zuzana", "Tomáš", "Magdalena", "Paweł", "Ivana", "Marek", "Ana", "Bogdan"],
    last: ["Nowak", "Kowalczyk", "Wiśniewska", "Zieliński", "Horváth", "Novotná", "Dvořák", "Kaczmarek", "Popescu", "Kovač", "Szabó", "Marin"],
    cities: ["Warsaw", "Krakow", "Prague", "Budapest", "Bucharest", "Ljubljana"],
  },
  {
    key: "uk_ie", weight: 8,
    first: ["Harriet", "Callum", "Niamh", "Oliver", "Imogen", "Rory", "Eleanor", "Fergus", "Siobhan", "Hamish", "Beth", "Declan"],
    last: ["Ashworth", "Gallagher", "Pemberton", "Doyle", "Whitfield", "Brennan", "Hargreaves", "Kavanagh", "Thornton", "Quinlan", "Sutcliffe", "Fairbairn"],
    cities: ["London", "Dublin", "Manchester", "Edinburgh", "Bristol"],
  },
  {
    key: "pt_gr_tr", weight: 6,
    first: ["Inês", "Tiago", "Beatriz", "Nikos", "Eleni", "Dimitris", "Elif", "Emre", "Zeynep", "Kerem", "Mariana", "Yannis"],
    last: ["Carvalho", "Ferreira", "Papadakis", "Alexiou", "Yılmaz", "Demir", "Kaya", "Oliveira", "Georgiou", "Aksoy", "Correia", "Stavrou"],
    cities: ["Lisbon", "Porto", "Athens", "Istanbul"],
  },
  {
    key: "global", weight: 11,
    first: ["Priya", "Arjun", "Ananya", "Rohan", "Chiamaka", "Tunde", "Amara", "Kwame", "Wei", "Mei", "Hao", "Yasmin", "Karim", "Nadia", "Rafael", "Juliana", "Samir", "Leila", "Kenji", "Aiko", "Thandiwe", "Omar", "Sofía", "Mateus"],
    last: ["Raman", "Iyer", "Chaudhary", "Okonkwo", "Adeyemi", "Mensah", "Chen", "Lin", "Zhou", "El Amrani", "Haddad", "Benali", "Souza", "Ribeiro", "Nakamura", "Tanaka", "Dlamini", "Farouk", "Rahimi", "Mehta", "Asante", "Bose", "Santos", "Kapoor"],
    cities: ["Amsterdam", "London", "Berlin", "Rotterdam", "Paris", "New York", "San Francisco", "Boston"],
  },
];

export interface FakeName {
  first: string;
  last: string;
  region: string;
  homeCity: string;
}

/** Generates unique fictional names; never repeats a full name. */
export class NameFactory {
  private used = new Set<string>();
  constructor(private rng: Rng) {}

  /** Reserve a name so the factory never generates it again (golden contacts, team). */
  reserve(first: string, last: string) {
    this.used.add(`${first} ${last}`.toLowerCase());
  }

  next(preferRegion?: string): FakeName {
    for (let attempt = 0; attempt < 200; attempt++) {
      const region = preferRegion && this.rng.chance(0.7)
        ? NAME_REGIONS.find((r) => r.key === preferRegion)!
        : this.rng.weighted(NAME_REGIONS.map((r) => [r, r.weight] as const));
      // 80% same-region surname, 20% mixed (partners, second-generation, etc.)
      const lastRegion = this.rng.chance(0.8) ? region : this.rng.pick(NAME_REGIONS);
      const first = this.rng.pick(region.first);
      const last = this.rng.pick(lastRegion.last);
      const key = `${first} ${last}`.toLowerCase();
      if (this.used.has(key)) continue;
      this.used.add(key);
      return { first, last, region: region.key, homeCity: this.rng.pick(region.cities) };
    }
    throw new Error("NameFactory ran out of unique names");
  }
}

/** Nickname / spelling variants used to plant near-duplicate contacts. */
export const NAME_VARIANTS: Record<string, string> = {
  Katarzyna: "Kasia", Javier: "Javi", Alessia: "Alessandra", Matthias: "Matze", Wouter: "Wout",
  Annelies: "Anneliese", Benedikt: "Bene", Dimitris: "Dimitrios", Nikos: "Nikolaos", Margaux: "Margot",
  Willemijn: "Willemien", Tijmen: "Tim", Franziska: "Franzi", Callum: "Cal", Eleanor: "Ellie",
  Hamish: "Ham", Michał: "Michal", Paweł: "Pawel", Chloé: "Chloe", Élise: "Elise", Lucía: "Lucia",
  Álvaro: "Alvaro", Tomáš: "Tomas", Inês: "Ines", Zoë: "Zoe", Mikkel: "Mikael", Johanna: "Hanna",
  Katharina: "Kathi", Jeroen: "Jerry", Pieter: "Piet", Christensen: "Christiansen",
};
