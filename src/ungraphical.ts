// ==UserScript==
// @name         无图模式
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  无图模式, 将网页中的img图片换成透明图
// @author       ZiPeng Ye <zero.cirno@gmail.com>
// @include      http*://*
// @grant        none
// ==/UserScript==
type GenTransparentPic = {
  (el: HTMLImageElement): Promise<string>
};

((): void => {
  'use strict';

  // 生成透明图
  const genTransparentPic: GenTransparentPic = (($canvas: HTMLCanvasElement):
    GenTransparentPic => (img: HTMLImageElement): Promise<string> => new Promise((resolve) => {
      // 生成透明图
      const genPic = (): string => {
        $canvas.width = img.naturalWidth;
        $canvas.height = img.naturalHeight;
        return $canvas.toDataURL('image/png');
      };
      // 已经加载完的图片则直接加载, 没加载完的等它加载完
      if (img.complete) {
        resolve(genPic());
      } else {
        img.addEventListener('load', () => {
          resolve(genPic());
        });
      }
    }))(document.createElement('canvas'));

  // 替换透明图
  const replaceTransparentPic = async (el: HTMLImageElement): Promise<void> => {
    const ungraphical = await genTransparentPic(el);
    if (el.dataset.ungraphical || !el.dataset.src) {
      el.dataset.src = el.src;
    }
    el.dataset.ungraphical = ungraphical;
    el.src = ungraphical;
    el.style.boxShadow = '0 0 6px gray';
  };

  // 透明图原图切换事件
  const replacePicEvent = (el: HTMLImageElement): void => {
    el.addEventListener('mouseenter', (): void => {
      el.src = el.dataset.src || '';
    });
    el.addEventListener('mouseleave', (): void => {
      el.src = el.dataset.ungraphical || '';
    });
  };

  // 替换图片
  const replacePic = async (el: HTMLImageElement): Promise<void> => {
    await replaceTransparentPic(el);
    replacePicEvent(el);
  };

  // 替换图片数组
  const replacePics = (els: HTMLImageElement[]): void => {
    els.forEach((el: HTMLImageElement) => replacePic(el));
  };

  // 文档加载初始化透明
  replacePics(Array.from(document.images as HTMLCollectionOf<HTMLImageElement>));

  // 监听文档变化
  (new MutationObserver((
    mutationsList: MutationRecord[],
  ): void => {
    mutationsList.forEach(({
      type,
      target,
      addedNodes,
      attributeName,
    }): void => {
      switch (type) {
        case 'childList':
          Array.from(addedNodes as NodeListOf<HTMLElement>)
            .forEach((addedNode: HTMLElement) => {
              // 如果是图片则直接处理, 如果是一个父节点则找到里面的img
              if (addedNode instanceof HTMLImageElement) {
                replacePic(addedNode);
              } else if (addedNode.querySelectorAll) {
                replacePics(Array.from(addedNode.querySelectorAll('img') as NodeListOf<HTMLImageElement>));
              }
            });
          break;
        case 'attributes':
          // attr = src 且 target = img
          // 但不是 切换透明图时
          if (!(
            attributeName === 'src' &&
            target instanceof HTMLImageElement
            ) || target.src === target.dataset.src
            || target.src === target.dataset.ungraphical
          ) {
            return;
          }
          replaceTransparentPic(target);
          break;
        default:
      }
    });
  })).observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
  });
})();
