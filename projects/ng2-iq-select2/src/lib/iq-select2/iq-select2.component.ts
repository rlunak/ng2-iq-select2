import {AfterViewInit, Component, ElementRef, EventEmitter, forwardRef, Input, Output, TemplateRef, ViewChild} from '@angular/core';
import {IqSelect2Item} from './iq-select2-item';
import {IqSelect2ResultsComponent} from '../iq-select2-results/iq-select2-results.component';
import {ControlValueAccessor, NG_VALUE_ACCESSOR, UntypedFormControl} from '@angular/forms';
import {Observable, of} from 'rxjs';
import {debounceTime, distinctUntilChanged, filter, map, mergeMap, switchMap, tap} from 'rxjs/operators';
import Messages from "./messages";

const KEY_CODE_DOWN_ARROW = 'ArrowDown';
const KEY_CODE_UP_ARROW = 'ArrowUp';
const KEY_CODE_ENTER = 'Enter';
const KEY_CODE_ESCAPE = 'Escape';
const KEY_CODE_DELETE = 'Delete';

@Component({
  selector: 'iq-select2',
  templateUrl: './iq-select2.component.html',
  styleUrls: ['./iq-select2.component.css'],
  providers: [{
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IqSelect2Component),
      multi: true
  }]
})
export class IqSelect2Component implements AfterViewInit, ControlValueAccessor {

  @Input() dataSourceProvider: (term: string, selected?: any[]) => Observable<any[]>;
  @Input() selectedProvider: (ids: string[]) => Observable<any[]>;
  @Input() iqSelect2ItemAdapter: (entity: any) => IqSelect2Item;

  @Input() referenceMode: 'id' | 'entity' = 'id';
  @Input() multiple = false;
  @Input() inputContainerClass: string;
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() maxResults: number;
  @Input() clientMode = false;
  @Input() badgeColor = 'info';
  @Input() wrapSelectedText = 'nowrap'

  @Input() debounceDelay = 250
  @Input() debounceLength = 2
  @Input() iconCaret = '&#9660;'
  @Input() iconDelete = '&#215;'
  @Input() messageMoreResults: string = Messages.MORE_RESULTS;
  @Input() messageNoResults: string = Messages.NO_RESULTS;

  @Output() onSelect: EventEmitter<IqSelect2Item> = new EventEmitter<IqSelect2Item>();
  @Output() onRemove: EventEmitter<IqSelect2Item> = new EventEmitter<IqSelect2Item>();

  @ViewChild('termInput') termInput: ElementRef
  @ViewChild('results') results: IqSelect2ResultsComponent;

  templateRef: TemplateRef<any>;
  term = new UntypedFormControl();
  resultsVisible = false;
  searchFocused = false;
  listData: IqSelect2Item[] = []
  fullDataList: IqSelect2Item[];
  selectedItems: IqSelect2Item[] = [];
  private placeholderSelected = '';

  onTouchedCallback: () => void = () => false
  onChangeCallback: (_: any) => void = () => false;

  constructor() {
  }

  ngAfterViewInit() {
    this.subscribeToChangesAndLoadDataFromObservable();
  }

  writeValue(selectedValues: any): void {
    if (selectedValues) {
      if (this.referenceMode === 'id') {
        this.populateItemsFromIds(selectedValues);
      } else {
        this.populateItemsFromEntities(selectedValues);
      }
    } else {
      this.placeholderSelected = '';
      this.selectedItems = [];
    }
  }

  registerOnChange(fn: any): void {
    this.onChangeCallback = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  private subscribeToChangesAndLoadDataFromObservable() {
    this.subscribeToResults(this.term.valueChanges.pipe(debounceTime(this.debounceDelay), distinctUntilChanged()));
  }

  private subscribeToResults(observable: Observable<string>): void {
    observable.pipe(
      tap(() => this.resultsVisible = false),
      filter((term) => term.length >= this.debounceLength),
      switchMap(term => this.loadDataFromObservable(term)),
      map(items => items.filter(item => !(this.multiple && this.alreadySelected(item)))),
      tap(() => this.resultsVisible = this.searchFocused)
    ).subscribe((items) => this.listData = items);
  }

  private loadDataFromObservable(term: string): Observable<IqSelect2Item[]> {
    return this.clientMode ? this.fetchAndFilterLocalData(term) : this.fetchData(term);
  }

  private fetchAndFilterLocalData(term: string): Observable<IqSelect2Item[]> {
    if (!this.fullDataList) {
      return this.fetchData('').pipe(
        mergeMap((items) => {
          this.fullDataList = items;
          return this.filterLocalData(term);
        })
      );
    } else {
      return this.filterLocalData(term);
    }
  }

  private filterLocalData(term: string): Observable<IqSelect2Item[]> {
    return of(this.fullDataList.filter(item => item.text.toLowerCase().includes(term.toLowerCase())));
  }

  private fetchData(term: string): Observable<IqSelect2Item[]> {
    return this.dataSourceProvider(term, this.buildValue()).pipe(map((items: any[]) => items.map((item) => this.iqSelect2ItemAdapter(item))));
  }

  private populateItemsFromEntities(selectedValues: any) {
    if (this.multiple) {
      this.handleMultipleWithEntities(selectedValues);
    } else {
      const iqSelect2Item = this.iqSelect2ItemAdapter(selectedValues);
      this.selectedItems = [iqSelect2Item];
      this.placeholderSelected = iqSelect2Item.text;
    }
  }

  private handleMultipleWithEntities(selectedValues: any) {
    this.selectedItems = [];

    selectedValues.forEach((entity) => {
      const item = this.iqSelect2ItemAdapter(entity);
      const ids = this.getSelectedIds();

      if (ids.indexOf(item.id) === -1) {
        this.selectedItems.push(item);
      }
    });
  }

  private populateItemsFromIds(selectedValues: any) {
    if (this.multiple) {
      this.handleMultipleWithIds(selectedValues);
    } else {
      this.handleSingleWithId(selectedValues);
    }
  }

  private handleMultipleWithIds(selectedValues: any) {
    if (selectedValues !== undefined && this.selectedProvider !== undefined) {
      const uniqueIds = [];
      selectedValues.forEach((id) => {
        if (uniqueIds.indexOf(id) === -1) {
          uniqueIds.push(id);
        }
      });

      this.selectedProvider(uniqueIds).subscribe((items: any[]) => {
        this.selectedItems = items.map(this.iqSelect2ItemAdapter);
      });
    }
  }

  private handleSingleWithId(id: any) {
    if (id !== undefined && this.selectedProvider !== undefined) {
      this.selectedProvider([id]).subscribe((items: any[]) => {
        items.forEach((item) => {
          const iqSelect2Item = this.iqSelect2ItemAdapter(item);
          this.selectedItems = [iqSelect2Item];
          this.placeholderSelected = iqSelect2Item.text;
        });
      });
    }
  }

  private alreadySelected(item: IqSelect2Item): boolean {
    let result = false;

    this.selectedItems.forEach(selectedItem => {
      if (selectedItem.id === item.id) {
        result = true;
      }
    });

    return result;
  }

  onItemSelected(item: IqSelect2Item) {
    if (this.multiple) {
      this.selectedItems.push(item);
      const index = this.listData.indexOf(item, 0);
      if (index > -1) {
        this.listData.splice(index, 1);
      }
    } else {
      this.selectedItems.length = 0;
      this.selectedItems.push(item);
    }

    this.onChangeCallback(this.buildValue());
    this.term.patchValue('', {emitEvent: false});

    if (this.multiple) {
      setTimeout(() => this.focusAndShowResults(), 1);
    } else {
      this.resultsVisible = false;
      this.placeholderSelected = item.text;
      this.termInput.nativeElement.blur()
    }

    this.onSelect.emit(item);
  }

  private getSelectedIds(): any {
    if (this.multiple) {
      return this.selectedItems.map(item => item.id)
    } else {
      return this.selectedItems.length === 0 ? null : this.selectedItems[0].id;
    }
  }

  private getEntities(): any[] {
    if (this.multiple) {
      return this.selectedItems.map(item => item.entity)
    } else {
      return this.selectedItems.length === 0 ? null : this.selectedItems[0].entity;
    }
  }

  removeItem(item: IqSelect2Item) {
    const index = this.selectedItems.indexOf(item, 0);

    if (index > -1) {
      this.selectedItems.splice(index, 1);
    }

    this.onChangeCallback(this.buildValue());
    this.onRemove.emit(item);

    if (!this.multiple) {
      this.placeholderSelected = '';
    }
  }

  private buildValue() {
    return 'id' === this.referenceMode ? this.getSelectedIds() : this.getEntities();
  }

  onFocus() {
    this.searchFocused = true
  }

  onBlur() {
    this.term.patchValue('', {emitEvent: false});
    this.searchFocused = false;
    this.resultsVisible = false;
    this.onTouchedCallback();
  }

  focus() {
    if (!this.disabled) {
      this.termInput.nativeElement.focus();
      this.resultsVisible = false;
    }

    this.searchFocused = !this.disabled;
  }

  focusAndShowResults() {
    if (!this.disabled) {
      this.termInput.nativeElement.focus();
      this.subscribeToResults(of(''));
    }

    this.searchFocused = !this.disabled;
  }

  onKeyUp(event: KeyboardEvent) {
    if (this.results) {
      if (event.key === KEY_CODE_ENTER) {
        this.results.selectCurrentItem();
      }
    } else {
      if (this.debounceLength === 0) {
        if (event.key === KEY_CODE_ENTER || event.key === KEY_CODE_DOWN_ARROW) {
          this.focusAndShowResults();
        }
      }
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === KEY_CODE_ENTER) {
      event.preventDefault();
    }

    if (!this.resultsVisible && event.key.includes('Arrow')) {
      this.resultsVisible = true
    }

    if (event.key === KEY_CODE_ESCAPE) {
      this.resultsVisible = false
    }

    if (event.key === KEY_CODE_DELETE) {
      const textEntered = !this.term.value || this.term.value.length === 0;
      if (textEntered && this.selectedItems.length > 0) {
        this.removeItem(this.selectedItems[this.selectedItems.length - 1]);
      }
    }

    if (this.results) {
      if (event.key === KEY_CODE_DOWN_ARROW) {
        this.results.activeNext();
      } else if (event.key === KEY_CODE_UP_ARROW) {
        this.results.activePrevious();
      }
    }
  }

  getPlaceholder(): string {
    return this.selectedItems.length > 0 ? this.placeholderSelected : this.placeholder;
  }

}
