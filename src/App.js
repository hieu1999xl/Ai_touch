import React, {useEffect, useRef, useState} from 'react';
import { Howl } from 'howler';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import { initNotifications, notify } from '@mycv/f8-notification';
import SoundURL from './asset/botay.mp3'

import './App.css';

var sound = new Howl({
  src: [SoundURL]
});


const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIMES = 50;
const TOUCHED_CONFIDENCE = 0.8;
function App() {

  const video = useRef();
  const classifier  = useRef();
  const canPlaySound  = useRef(true);
  const mobilenetModule = useRef();
  const [touched, setTouched] = useState(false)

  const init = async () =>{
    console.log('aaaaaaaaa');
    await setupCamera();
    console.log('đang setup');

    classifier.current = knnClassifier.create();
    mobilenetModule.current = await mobilenet.load();
    console.log('setup done');
    console.log('camera khởi động thành công');
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) =>{
      navigator.getUserMedia = navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;

      if (navigator.getUserMedia){
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve);
          },
          error => reject(error)
          
        );
      }else {
        reject();
      }
    })
  }

  const train = async label => {
    console.log(`[${label}] đang train cho máy mặt đẹp trai của Hiếu...`)
    for (let i = 0; i < TRAINING_TIMES; ++i) {
      console.log(`progress ${parseInt((i+1) / TRAINING_TIMES *100)}%`)
      await training(label);
    }
  }
  /**
   * Bước 1: Trai cho máy khuôn mặt chưa chạm tay
   * Bước 2: train cho máy khuôn mặt có chạm mặt
   * Bước 3: lấy hình ảnh hiện tại, phân tích và so sánh với  data đã học trước đó
   * ==> nếu mà matching vói data khuôn mặt chạm tay ==> cảnh báo
   * @param {*} label 
   */
  const training = label => {
    return new Promise(async resolve =>{
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, label)
      await sleep(100);
      resolve();
    });
  }

  const run = async () => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);
    // console.log('label: ', result.label);
    // console.log('Confidences: ', result.confidences);
    if (
      result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > TOUCHED_CONFIDENCE
    ){
      console.log('Touch');
      if (canPlaySound.current ){
        canPlaySound.current = false;
        sound.play();
      }
      
      notify('Bỏ tay ra', { body: 'Bỏ tay ra bạn êi.' });
      setTouched(true);
    }else{
      console.log('not touch');
      setTouched(false);
    }
    await sleep(200);
    run();
  }
  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  useEffect(() =>{
    init();

    sound.on('end', function() {
      canPlaySound.current = true;
    });
    return () => {

    }
  }, []);


  return (
    <div className={`main ${touched ? 'touched': ''}`}>
      <video 
      ref = {video}
      className="video"
      autoPlay
      />
      <div className="control">
        <button className="btn" onClick={()=> train(NOT_TOUCH_LABEL)}>1</button>
        <button className="btn" onClick={()=> train(TOUCHED_LABEL)}>2</button>
        <button className="btn" onClick={()=> run()}>3</button>

      </div>
    </div>
  );
}

export default App;
