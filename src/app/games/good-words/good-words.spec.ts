import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GoodWords } from './good-words';

describe('GoodWords', () => {
  let component: GoodWords;
  let fixture: ComponentFixture<GoodWords>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoodWords],
    }).compileComponents();

    fixture = TestBed.createComponent(GoodWords);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
