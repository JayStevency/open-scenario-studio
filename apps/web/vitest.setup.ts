/**
 * jsdom 은 레이아웃을 계산하지 않는다 — 요소 크기가 늘 0 이고 ResizeObserver 도 없다.
 * 가상 스크롤은 컨테이너 크기를 알아야 행을 그리므로, 크기를 가진 것처럼 꾸며 준다.
 */
// 이 파일은 node 환경 테스트에서도 실행된다. DOM 이 없으면 아무것도 하지 않는다.
if (typeof HTMLElement !== 'undefined') {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      constructor(private readonly cb: ResizeObserverCallback) {}
      observe(target: Element) {
        this.cb(
          [{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        )
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }

  // 가상 스크롤은 offsetWidth/Height 로 컨테이너를 잰다.
  for (const [prop, value] of [
    ['offsetWidth', 1280],
    ['offsetHeight', 720],
    ['clientWidth', 1280],
    ['clientHeight', 720],
  ] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value })
  }

  Element.prototype.getBoundingClientRect = () => ({
    width: 1280,
    height: 720,
    top: 0,
    left: 0,
    right: 1280,
    bottom: 720,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
}
