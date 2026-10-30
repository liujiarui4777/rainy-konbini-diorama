import * as THREE from 'three';

/* ============================================================
   静态几何合批：把同材质的网格合并成一个大网格，大幅降低 draw call
   场景里所有静态物件都可以合，动态物体（雨、精灵、灯光）不受影响
   ============================================================ */

function prepGeometry(geo, matrix) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (!g.attributes.normal) g.computeVertexNormals();
  const pos = g.attributes.position.array;
  const nor = g.attributes.normal.array;
  const count = g.attributes.position.count;
  const uv = g.attributes.uv ? g.attributes.uv.array : new Float32Array(count * 2);

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  out.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
  out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  out.applyMatrix4(matrix);
  return out;
}

function concat(list) {
  let total = 0;
  for (const g of list) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let off = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, off * 3);
    nor.set(g.attributes.normal.array, off * 3);
    uv.set(g.attributes.uv.array, off * 2);
    off += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.computeBoundingSphere();
  return out;
}

/**
 * @param {THREE.Object3D} root 需要合批的根节点
 * @param {THREE.Object3D} target 合并结果挂到哪里（一般是 scene）
 * @returns {{before:number, after:number}}
 */
export function mergeStatic(root, target) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const originals = [];
  let before = 0;

  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSprite) return;
    const mat = o.material;
    if (!mat || Array.isArray(mat)) return;
    if (mat.isShaderMaterial && !o.userData.isOutline) return; // 地面/积水等自定义 shader 保留
    if (o.userData.noMerge) return;
    if (!o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) return;
    before++;

    const key = [
      mat.uuid,
      o.castShadow ? 1 : 0,
      o.receiveShadow ? 1 : 0,
      o.renderOrder || 0,
      o.userData.isOutline ? 1 : 0,
    ].join('|');
    if (!buckets.has(key)) {
      buckets.set(key, {
        mat,
        castShadow: o.castShadow,
        receiveShadow: o.receiveShadow,
        renderOrder: o.renderOrder || 0,
        isOutline: !!o.userData.isOutline,
        geos: [],
      });
    }
    buckets.get(key).geos.push(prepGeometry(o.geometry, o.matrixWorld));
    originals.push(o);
  });

  // 从原位置移除
  for (const o of originals) {
    if (o.parent) o.parent.remove(o);
  }

  let after = 0;
  for (const b of buckets.values()) {
    if (b.geos.length === 0) continue;
    const geo = b.geos.length === 1 ? b.geos[0] : concat(b.geos);
    const mesh = new THREE.Mesh(geo, b.mat);
    mesh.castShadow = b.castShadow;
    mesh.receiveShadow = b.receiveShadow;
    mesh.renderOrder = b.renderOrder;
    mesh.frustumCulled = false;
    if (b.isOutline) mesh.userData.isOutline = true;
    target.add(mesh);
    after++;
    for (const g of b.geos) if (g !== geo) g.dispose();
  }
  return { before, after };
}
