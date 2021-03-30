// get this data from API, set type 'any' to properties which proper type I don`t know
export interface ConceptMapData {
  concepts: {
    id: number,
    concept: string,
    domain: string,
    class: string,
    rating: any,
    forms: string,
    searchConceptsCalled: any,
    parsed: any,
    definition: any,
    getDefinitionCalled: any,
    isAspect: boolean,
    aspectOf: number,
    found_count: number
  }[];
  relations: {
    id: number,
    concept_id: number,
    view: string,
    thesis: string,
    class: string,
    rating: any,
    count: any,
    parsed: any,
    hasConcept: any,
    to_concept_id: number,
    to_thesis_id: any,
    to_thesis_caption: any
  }[];
  didactic: {
    id: number,
    from_id: number,
    to_id: number,
    CF: number,
    CF_alt: any,
    called: any
  }[];
  CinT: any[];
  CinC: any[];
}
