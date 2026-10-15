import { Injectable } from '@angular/core';

interface Cell {
  row: number;
  col: number;
}

@Injectable({
  providedIn: 'root'
})
export class BoardGeneratorService {

  private readonly BOARD_SIZE = 5;

  private readonly LETTERS =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  generateBoard(word: string): string[][] {

    const normalizedWord =
      word.toUpperCase();

    console.log(
      'BOARD GENERATOR START:',
      normalizedWord
    );

    // Kelime 25 hücreden uzun olamaz
    if (
      normalizedWord.length >
      this.BOARD_SIZE * this.BOARD_SIZE
    ) {
      throw new Error(
        `Word "${normalizedWord}" is too long for a 5x5 board.`
      );
    }

    const board =
      this.createEmptyBoard();

    const path =
      this.createPath(
        normalizedWord.length
      );

    console.log(
      'PATH CREATED:',
      path
    );

    this.placeWord(
      board,
      normalizedWord,
      path
    );

    this.fillEmptyCells(board);

    console.log(
      'BOARD GENERATED:',
      board
    );

    return board;
  }


  // Boş 5x5 tahta oluşturur
  private createEmptyBoard(): string[][] {

    return Array.from(
      { length: this.BOARD_SIZE },
      () =>
        Array(this.BOARD_SIZE).fill('')
    );
  }


  // Kelime için rastgele geçerli bir yol oluşturur
  private createPath(
    length: number
  ): Cell[] {

    const maxAttempts = 100;

    for (
      let attempt = 0;
      attempt < maxAttempts;
      attempt++
    ) {

      const path: Cell[] = [];

      const visited =
        new Set<string>();


      // Rastgele başlangıç hücresi
      const start: Cell = {
        row: this.randomNumber(
          0,
          this.BOARD_SIZE - 1
        ),

        col: this.randomNumber(
          0,
          this.BOARD_SIZE - 1
        )
      };


      path.push(start);

      visited.add(
        `${start.row},${start.col}`
      );


      // Başlangıçtan itibaren yol oluştur
      const found =
        this.searchRandomPath(
          length,
          path,
          visited
        );


      if (found) {
        return path;
      }
    }


    throw new Error(
      `Could not create random path of length ${length}.`
    );
  }


  // Rastgele komşular üzerinden yolu devam ettirir
  private searchRandomPath(
    length: number,
    path: Cell[],
    visited: Set<string>
  ): boolean {

    // Kelimenin tüm harfleri için hücre bulundu
    if (
      path.length === length
    ) {
      return true;
    }


    const current =
      path[path.length - 1];


    // Kullanılmamış komşuları bul
    const neighbors =
      this.getAvailableNeighbors(
        current,
        visited
      );


    // Komşuların sırasını karıştır
    this.shuffle(neighbors);


    // Her komşuyu sırayla dene
    for (const neighbor of neighbors) {

      const key =
        `${neighbor.row},${neighbor.col}`;


      visited.add(key);

      path.push(neighbor);


      const found =
        this.searchRandomPath(
          length,
          path,
          visited
        );


      if (found) {
        return true;
      }


      // Bu yol çıkmaza girdiyse geri dön
      path.pop();

      visited.delete(key);
    }


    return false;
  }


  // Bir hücrenin kullanılmamış komşularını bulur
  private getAvailableNeighbors(
    cell: Cell,
    visited: Set<string>
  ): Cell[] {

    const neighbors: Cell[] = [];


    // 8 yönlü komşuluk:
    //
    // ↖ ↑ ↗
    // ←   →
    // ↙ ↓ ↘

    for (
      let rowOffset = -1;
      rowOffset <= 1;
      rowOffset++
    ) {

      for (
        let colOffset = -1;
        colOffset <= 1;
        colOffset++
      ) {

        // Aynı hücreyi atla
        if (
          rowOffset === 0 &&
          colOffset === 0
        ) {
          continue;
        }


        const row =
          cell.row + rowOffset;

        const col =
          cell.col + colOffset;


        // Tahta dışındaysa atla
        if (
          row < 0 ||
          row >= this.BOARD_SIZE ||
          col < 0 ||
          col >= this.BOARD_SIZE
        ) {
          continue;
        }


        const key =
          `${row},${col}`;


        // Daha önce kullanılmadıysa ekle
        if (
          !visited.has(key)
        ) {

          neighbors.push({
            row,
            col
          });

        }
      }
    }


    return neighbors;
  }


  // Kelimeyi bulunan path üzerine yerleştirir
  private placeWord(
    board: string[][],
    word: string,
    path: Cell[]
  ): void {

    for (
      let i = 0;
      i < word.length;
      i++
    ) {

      const cell =
        path[i];

      board[cell.row][cell.col] =
        word[i];
    }
  }


  // Kelimenin dışında kalan hücreleri rastgele harflerle doldurur
  private fillEmptyCells(
    board: string[][]
  ): void {

    for (
      let row = 0;
      row < this.BOARD_SIZE;
      row++
    ) {

      for (
        let col = 0;
        col < this.BOARD_SIZE;
        col++
      ) {

        if (
          board[row][col] === ''
        ) {

          board[row][col] =
            this.getRandomLetter();

        }
      }
    }
  }


  // Rastgele harf üretir
  private getRandomLetter(): string {

    const randomIndex =
      Math.floor(
        Math.random() *
        this.LETTERS.length
      );

    return this.LETTERS[
      randomIndex
    ];
  }


  // min ve max arasında rastgele sayı üretir
  private randomNumber(
    min: number,
    max: number
  ): number {

    return Math.floor(
      Math.random() *
      (max - min + 1)
    ) + min;
  }


  // Array'i rastgele karıştırır
  private shuffle<T>(
    array: T[]
  ): void {

    for (
      let i = array.length - 1;
      i > 0;
      i--
    ) {

      const randomIndex =
        Math.floor(
          Math.random() *
          (i + 1)
        );


      [
        array[i],
        array[randomIndex]
      ] = [
        array[randomIndex],
        array[i]
      ];
    }
  }

}