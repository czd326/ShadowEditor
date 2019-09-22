import BaseSerializer from '../BaseSerializer';
import Object3DSerializer from './Object3DSerializer';
import ModelLoader from '../../loader/ModelLoader';

/**
 * ServerObject
 * @author tengge / https://github.com/tengge1
 */
function ServerObject() {
    BaseSerializer.call(this);
}

ServerObject.prototype = Object.create(BaseSerializer.prototype);
ServerObject.prototype.constructor = ServerObject;

ServerObject.prototype.toJSON = function (obj) {
    var json = Object3DSerializer.prototype.toJSON.call(this, obj);
    json.userData = Object.assign({}, obj.userData);
    delete json.userData.model;
    delete json.userData.obj; // 以后下载对象缓存统一改为obj
    delete json.userData.root; // 模型根节点
    delete json.userData.helper;

    return json;
};

ServerObject.prototype.fromJSON = function (json, options, environment) {
    let url = json.userData.Url;

    if (url.indexOf(';') > -1) { // 包含多个入口文件
        url = url.split(';').map(n => options.server + n);
    } else {
        url = options.server + url;
    }

    // 将server传递给MMDLoader，以便下载资源
    environment.server = options.server;

    const loader = new ModelLoader();

    return new Promise(resolve => {
        loader.load(url, json.userData, environment).then(obj => {
            if (obj) {
                Object3DSerializer.prototype.fromJSON.call(this, json, obj);

                // 还原原始模型的uuid
                if (Array.isArray(json.userData._children)) {
                    this.revertUUID(obj.children, json.userData._children);
                }

                resolve(obj);
            } else {
                resolve(null);
            }
        });
    });
};

/**
 * 还原原始模型的uuid。
 * @param {THREE.Object3D} children 部件
 * @param {Array} list 原始的uuid列表
 */
ServerObject.prototype.revertUUID = function (children, list) {
    for (let i = 0; i < children.length; i++) {
        let child = children[i];

        if (list[i]) {
            child.uuid = list[i].uuid;
        }

        if (child.children && list[i] && list[i].children) {
            this.revertUUID(child.children, list[i].children)
        }
    }
};

export default ServerObject;