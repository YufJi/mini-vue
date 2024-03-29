import { ASSET_TYPES } from 'shared/constants';
import { isPlainObject, validateComponentName } from '../util/index';

export function initAssetRegisters(Vue) {
  /**
   * Create asset registration methods.
   */
  ASSET_TYPES.forEach((type) => {
    Vue[type] = function (id, definition) {
      if (!definition) {
        return this.options[`${type}s`][id];
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id);
        }
        // 定义组件
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id;
          definition = this.options._base.extend(definition);
        }

        this.options[`${type}s`][id] = definition;

        return definition;
      }
    };
  });
}
