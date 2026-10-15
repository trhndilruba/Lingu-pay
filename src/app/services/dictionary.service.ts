import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

interface DatamuseResponse {
  word: string;
  defs?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DictionaryService {

  private readonly API_URL =
    'https://api.datamuse.com/words';

  constructor(
    private http: HttpClient
  ) {}

  getDefinition(
    word: string
  ): Observable<string> {

    const url =
      `${this.API_URL}?sp=${word.toLowerCase()}&md=d&max=1`;

    console.log(
      'DICTIONARY REQUEST:',
      url
    );

    return this.http
      .get<DatamuseResponse[]>(url)
      .pipe(

        map((response) => {

          console.log(
            'DICTIONARY RESPONSE:',
            response
          );

          const definition =
            response[0]
              ?.defs?.[0];

          if (!definition) {
            return 'Definition not available.';
          }

          // Datamuse definition formatı:
          // "n\tdefinition text"
          // "v\tdefinition text"
          //
          // Burada başındaki "n\t" veya "v\t"
          // kısmını kaldırıyoruz.

          return definition.replace(
            /^[a-z]+\t/,
            ''
          );
        }),

        catchError((error) => {

          console.error(
            'Dictionary API failed:',
            error
          );

          return of(
            'Definition not available.'
          );
        })
      );
  }
}