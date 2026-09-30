import { Greek } from './greek';

/* The pale Greek backdrop behind the quiz screens (shapes, column, olive
   branches, key bands). Styled in styles.css under `.tp-decor`; hidden in brut. */
export function TopicDecor() {
  return (
    <div className="hs-deco tp-decor" aria-hidden="true">
      <Greek name="bg-shape-1" className="blob b-tl" />
      <Greek name="bg-shape-3" className="blob b-tr" />
      <Greek name="bg-shape-3" className="blob b-bl" />
      <Greek name="bg-shape-2" className="blob b-br" />
      <Greek name="column" className="orn o-column" />
      <Greek name="olive-branch" className="orn o-olive-tl" />
      <Greek name="greek-key" className="orn o-key-tr" />
      <Greek name="hill-temple" className="orn o-temple" />
      <Greek name="amphora" className="orn o-amphora" />
      <Greek name="olive-branch-small" className="orn o-olive-bl" />
      <Greek name="olive-branch" className="orn o-olive-br" />
      <Greek name="greek-key-small" className="orn o-key-bl" />
      <Greek name="decorative-diamond" className="orn o-diamond d1" />
      <Greek name="decorative-diamond" className="orn o-diamond d2" />
    </div>
  );
}
