import { TestBed } from '@angular/core/testing';
import { BoardGeneratorService } from './board-generator.service';

describe('BoardGeneratorService', () => {

  let service: BoardGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    service = TestBed.inject(
      BoardGeneratorService
    );
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

});