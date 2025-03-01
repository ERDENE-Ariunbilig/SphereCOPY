/*!
Thick Terrain #3 animation
 * animation
 * simplexNoise 3D使用
 */
"use strict";
console.clear();

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
//import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";
import { SimplexNoise } from "three/addons/math/SimplexNoise";
import { Timer } from "three/addons/misc/Timer.js";

(function () {
  let camera, scene, renderer, controls;
  let geometry, material, mesh;

  // perlin noise
  const noise = new SimplexNoise();
  const noiseScale = 0.3; // ノイズのスケール
  const noiseHeight = 1; // 高さの影響度

  // animation
  let anim_position;
  const timer = new Timer();

  init();
  obj();

  function obj() {
    //
    // **パラメータ設定**
    const width = 10;
    const height = 10;
    const bottomHeight = -3; // or 0 底面のy値
    const segments = 50;
    const gridSize = segments + 1;

    // **上面（変形Plane）を作成**
    const planeGeometry = new THREE.PlaneGeometry(
      width,
      height,
      segments,
      segments
    );
    planeGeometry.rotateX(-Math.PI / 2); // 上向きに回転

    // SimplexNoiseを使用して上面の変形 /////
    const position = planeGeometry.attributes.position;

    for (let i = 0; i < position.count; i++) {
      // `noise2D` を使用して、y 方向にも変化を与える
      const noiseValue =
        noise.noise(
          position.getX(i) * noiseScale,
          position.getZ(i) * noiseScale
        ) * noiseHeight;
      position.setY(i, position.getY(i) + noiseValue);
    }

    // 変更を適用
    position.needsUpdate = true;
    planeGeometry.computeVertexNormals(); // 法線を再計算し、ライティングを調整

    // **ジオメトリ統合用の配列** /////////
    let vertices = Array.from(position.array);
    const indices = Array.from(planeGeometry.index.array);

    // **`groups` 用のオフセット（各面の開始位置）**
    let indexOffset = indices.length; // 上面のインデックス数

    // **側面の作成**
    const addSide = (i1, i2) => {
      const baseIndex = vertices.length / 3; // 現在の頂点数を取得（新規頂点のインデックス計算）
      vertices.push(
        vertices[i1 * 3],
        vertices[i1 * 3 + 1],
        vertices[i1 * 3 + 2], // 上の1点目
        vertices[i2 * 3],
        vertices[i2 * 3 + 1],
        vertices[i2 * 3 + 2], // 上の2点目
        vertices[i1 * 3],
        bottomHeight,
        vertices[i1 * 3 + 2], // 下の1点目
        vertices[i2 * 3],
        bottomHeight,
        vertices[i2 * 3 + 2] // 下の2点目
      );

      indices.push(
        baseIndex,
        baseIndex + 1,
        baseIndex + 2,
        baseIndex + 2,
        baseIndex + 1,
        baseIndex + 3
      );
    };

    // 側面のグループ開始インデックスを記録
    const sideStartIndices = []; // for group

    // 左側
    sideStartIndices.push(indices.length); // for group
    for (let i = 0; i < segments; i++) {
      addSide(i * gridSize, (i + 1) * gridSize);
    }

    // 右側
    sideStartIndices.push(indices.length); // for group
    for (let i = 0; i < segments; i++) {
      addSide((i + 1) * gridSize - 1, (i + 2) * gridSize - 1);
    }

    // 前側
    sideStartIndices.push(indices.length); // for group
    for (let i = 0; i < segments; i++) {
      addSide(i, i + 1);
    }

    // 後側
    sideStartIndices.push(indices.length); // for group
    for (let i = 0; i < segments; i++) {
      addSide(gridSize * segments + i, gridSize * segments + i + 1);
    }

    // **底面の作成**
    const bottomStartIndex = indices.length; // for group
    const bottomBaseIndex = vertices.length / 3;
    vertices.push(
      -width / 2,
      bottomHeight,
      -height / 2,
      width / 2,
      bottomHeight,
      -height / 2,
      -width / 2,
      bottomHeight,
      height / 2,
      width / 2,
      bottomHeight,
      height / 2
    );
    indices.push(
      bottomBaseIndex,
      bottomBaseIndex + 1,
      bottomBaseIndex + 2,
      bottomBaseIndex + 2,
      bottomBaseIndex + 1,
      bottomBaseIndex + 3
    );

    // **統合ジオメトリを作成**
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // **グループ設定（各面ごとに異なるマテリアルを適用）**
    geometry.addGroup(0, indexOffset, 0); // 上面
    geometry.addGroup(
      sideStartIndices[0],
      sideStartIndices[1] - sideStartIndices[0],
      1
    ); // 左
    geometry.addGroup(
      sideStartIndices[1],
      sideStartIndices[2] - sideStartIndices[1],
      2
    ); // 右
    geometry.addGroup(
      sideStartIndices[2],
      sideStartIndices[3] - sideStartIndices[2],
      3
    ); // 前
    geometry.addGroup(
      sideStartIndices[3],
      bottomStartIndex - sideStartIndices[3],
      4
    ); // 後
    geometry.addGroup(bottomStartIndex, indices.length - bottomStartIndex, 5); // 底面

    /*
    //
    material = new THREE.MeshNormalMaterial({
      //color: 0x44aa88,
      side: THREE.DoubleSide,
      wireframe: true
    });
    mesh = new THREE.Mesh(geometry, material);
*/
    // **複数のマテリアルを作成**
    const materials = [
      new THREE.MeshNormalMaterial({
        //color: 0xff0000,
        side: THREE.DoubleSide,
        wireframe: true
      }), // 上面（赤）
      new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        side: THREE.DoubleSide,
        wireframe: true
      }), // 左面（緑）
      new THREE.MeshBasicMaterial({
        color: 0x0000ff,
        side: THREE.DoubleSide,
        wireframe: true
      }), // 右面（青）
      new THREE.MeshBasicMaterial({
        color: 0xffff00,
        side: THREE.DoubleSide,
        wireframe: true
      }), // 前面（黄）
      new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        side: THREE.DoubleSide,
        wireframe: true
      }), // 後面（紫）
      new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        side: THREE.DoubleSide,
        wireframe: true
      }) // 底面（水色）
    ];
    mesh = new THREE.Mesh(geometry, materials);
    scene.add(mesh);

    // for animation
    anim_position = geometry.attributes.position;
  }
  function init() {
    //
    scene = new THREE.Scene();
    //
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);
    //
    camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    camera.position.set(0, 3, 20);
    //
    controls = new OrbitControls(camera, renderer.domElement);
    //controls.autoRotate = true;
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.maxDistance = camera.far / 2;
    controls.target.set(0, 0, 0);
    controls.update();
    //
    window.addEventListener("resize", onWindowResize);
  }
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  function animate(timestamp) {
    controls.update();

    timer.update(timestamp);
    const elapsedTime = timer.getElapsed();

    for (let i = 0; i < anim_position.count; i++) {
      if (anim_position.getY(i) < -noiseHeight) continue;
      // `noise3D` を使用して、y 方向にも変化を与える
      /*
      const noiseValue =
        noise.noise(
          (anim_position.getX(i) + elapsedTime) * noiseScale,
          (anim_position.getZ(i) + elapsedTime) * noiseScale
        ) * noiseHeight;
*/
      /*
      const noiseValue =
        noise.noise3d(
          (anim_position.getX(i) + 0) * noiseScale,
          (anim_position.getZ(i) + 0) * noiseScale,
          elapsedTime
        ) * noiseHeight;
*/
      const noiseValue =
        noise.noise3d(
          (anim_position.getX(i) + Math.sin(elapsedTime)) * noiseScale,
          (anim_position.getZ(i) + Math.cos(elapsedTime)) * noiseScale,
          elapsedTime // お好みで
        ) * noiseHeight;

      /*
      const noiseValue =
        noise.noise4d(
          (anim_position.getX(i) + 0) * noiseScale,
          (anim_position.getY(i) + 0) * noiseScale,
          (anim_position.getZ(i) + 0) * noiseScale,
          elapsedTime
        ) * noiseHeight;
*/
      anim_position.setY(i, noiseValue);
    }

    // 変更を適用
    anim_position.needsUpdate = true;
    mesh.geometry.computeVertexNormals();

    renderer.render(scene, camera);
  }
})();