#include <EEPROM.h>
#include "GravityTDS.h"
 
#define TdsSensorPin A1 // PIN TDS sensor
const int trigPin = 2;     //PIN Ultrasonic
const int echoPin = 3;  //PIN Ultrasonic
int Relay = 10; //RELAY
// int Relay2 = 11 //RELAY 2 AIR UTAMA -> Ember
GravityTDS gravityTds;
 
long duration;
float distanceCm;
const float tinggiSensor = 30.0;

float temperature = 25,tdsValue = 0;
 
void setup()
{
    Serial.begin(9600);
    pinMode(trigPin, OUTPUT);
    pinMode(echoPin, INPUT);
    pinMode(Relay, OUTPUT);
    gravityTds.setPin(TdsSensorPin);
    gravityTds.setAref(5.0);  //reference voltage on ADC, default 5.0V on Arduino UNO
    gravityTds.setAdcRange(1024);  //1024 for 10bit ADC;4096 for 12bit ADC
    gravityTds.begin();  //initialization
}
 
void loop()
{

    //Cek jarak air
  	duration = pulseIn(echoPin, HIGH);
  	distanceCm = duration * 0.034 / 2;

    float waterLevel = distanceCm;

  //Cek PPM air
    gravityTds.setTemperature(temperature);  // set the temperature and execute temperature compensation
    gravityTds.update();  //sample and calculate
    tdsValue = gravityTds.getTdsValue();  // then get the value
    Serial.print(tdsValue,0);
    Serial.println("ppm");


  //Print water level
  	if (waterLevel < 0) waterLevel = 0;
    Serial.print("Water Level: ");
    Serial.print(waterLevel);
    Serial.println(" cm");
  //Print PPM
    if (tdsValue < 700)
    Serial.println("Nutrisi dibawah threshold!");

    //Jarak diatas 10 cm
    if(waterLevel > 10){
      digitalWrite(Relay2,HIGH);
      Serial.println("Relay pompa menyala");
    }
  	
    //nyala sampai water level memenuhi
    if(waterLevel < 10);{
      digitalWrite(Relay2, LOW);
      // Serial.println("Relay pompa mati");
    }

    //Tolong buatin untuk pompa ke hidroponik. Ini nyala per waktu(tes tiap 10 detik nyala)
}