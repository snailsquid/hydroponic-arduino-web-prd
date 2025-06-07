#include <EEPROM.h>
#include "GravityTDS.h"
 
#define TdsSensorPin A1 // PIN TDS sensor
const int trigPin = 2;     //PIN Ultrasonic
const int echoPin = 3;  //PIN Ultrasonic
int Relay = 10; //RELAY
int Relay2 = 11; //RELAY untuk tes2
GravityTDS gravityTds;
 
long duration;
float distanceCm;
const float tinggiSensor = 30.0;

float temperature = 25,tdsValue = 0;

int checkDelay = 400;

int masukDelay = 20000;
int masukTime = 3000;

int masukCount = 0;

int prevWater = 0;
int maxThreshold = 100;
 
void setup()
{
    Serial.begin(9600);
    pinMode(trigPin, OUTPUT);
    pinMode(echoPin, INPUT);
    pinMode(Relay, OUTPUT);
    // pinMode(Relay2, OUTPUT);
    gravityTds.setPin(TdsSensorPin);
    gravityTds.setAref(5.0);  //reference voltage on ADC, default 5.0V on Arduino UNO
    gravityTds.setAdcRange(1024);  //1024 for 10bit ADC;4096 for 12bit ADC
    gravityTds.begin();  //initialization
}
 
void loop()
{
// --- Ultrasonic Sensor Code ---
  // Clear the trigPin by setting it LOW for a moment
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  // Set the trigPin HIGH for 10 microseconds to send a pulse
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW); // Set trigPin LOW again

  // Measure the duration of the pulse on the echoPin
    //Cek jarak air
  	duration = pulseIn(echoPin, HIGH);
  	distanceCm = duration * 0.034 / 2;

    float waterLevel = distanceCm;
    // if(waterLevel>maxThreshold){
    //   waterLevel = prevWater;
    // }else{

    // prevWater = waterLevel;
    // }

  //Cek PPM air
    gravityTds.setTemperature(temperature);  // set the temperature and execute temperature compensation
    gravityTds.update();  //sample and calculate
    tdsValue = gravityTds.getTdsValue();  // then get the value
    // Serial.println("ppm");


  //Print water level
  	if (waterLevel < 0) waterLevel = 0;
    // Serial.print("Water Level: ");
    // Serial.print(waterLevel);
    // Serial.println(" cm");
    Serial.print("distance:");
    Serial.print(waterLevel);
    Serial.print(",tds:");
    Serial.println(tdsValue,0);

  //Print PPM
    // if (tdsValue < 700)
    //   Serial.print("Nutrisi dibawah threshold!");
    int height =30;
    //Jarak diatas 10 cm
      // digitalWrite(Relay,HIGH);
    if(waterLevel < height){
      digitalWrite(Relay,HIGH);
      // Serial.println("Relay pompa menyala");
    }
    else {
      digitalWrite(Relay, LOW);
      // Serial.println("Relay pompa mati");
    }

    // if(masukCount >= masukDelay){
    //   digitalWrite(Relay2,LOW);
    //   if(masukCount >= masukDelay+masukTime){
    //   digitalWrite(Relay2,HIGH);
    //   masukCount = 0;
    //   }
    // }
    delay(checkDelay);
  masukCount += checkDelay;
    //Tolong buatin untuk pompa ke hidroponik. Ini nyala per waktu(tes tiap 10 detik nyala)
}