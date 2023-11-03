import {Component, ElementRef, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild} from '@angular/core';
import {IqSelect2Item} from '../iq-select2/iq-select2-item';
import Messages from "../iq-select2/messages";

@Component({
  selector: 'iq-select2-results',
  templateUrl: './iq-select2-results.component.html',
  styleUrls: ['./iq-select2-results.component.css']
})
export class IqSelect2ResultsComponent implements OnInit {

  @ViewChild('container') container: ElementRef;

  @Input() items: IqSelect2Item[] = []
  @Input() maxResults: number;
  @Input() messageMoreResults: string;
  @Input() messageNoResults: string;
  @Input() resultsVisible: boolean;
  @Input() selectedItems: IqSelect2Item[];
  @Input() templateRef: TemplateRef<any>;
  @Output() onItemSelected: EventEmitter<IqSelect2Item> = new EventEmitter();

  activeIndex = 0;

  private usingKeys = false;

  constructor() {
  }

  ngOnInit() {
  }

  selectItem(item: IqSelect2Item) {
    this.onItemSelected.emit(item);
  }

  activeNext() {
    if (this.activeIndex >= (this.maxResults ?? this.items.length) - 1) {
      this.activeIndex = 0;
    } else {
      this.activeIndex++;
    }

    this.scrollToElement();
    this.usingKeys = true;
  }

  activePrevious() {
    if (this.activeIndex - 1 < 0) {
      this.activeIndex = this.items.length - 1;
    } else {
      this.activeIndex--;
    }

    this.scrollToElement();
    this.usingKeys = true;
  }

  scrollToElement() {
    const element = document.getElementById('item_' + this.activeIndex);

    if (element) {
      this.container.nativeElement.scrollTop = element.offsetTop;
    }
  }

  selectCurrentItem() {
    if (this.items[this.activeIndex]) {
      this.selectItem(this.items[this.activeIndex]);
      this.activeIndex = 0;
    }
  }

  onMouseOver(index: number) {
    if (!this.usingKeys) {
      this.activeIndex = index;
    }
  }

  onHovering(event) {
    this.usingKeys = false;
  }

  isSelected(currentItem) {
    let result = false;

    this.selectedItems.forEach(item => {
      if (item.id === currentItem.id) {
        result = true;
      }
    });

    return result;
  }

  getCountMessage(): string {
    return this.messageMoreResults.replace(Messages.VISIBLE_COUNT_VAR, String(this.maxResults))
      .replace(Messages.MAX_COUNT_VAR, String(this.items.length + this.selectedItems.length));
  }

}
