"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ToggleGroup } from "radix-ui";

export default function CarouselClient() {
    const [curr, setCurr] = useState<number>(1);
    const [next, setNext] = useState<number>(2);
    const [isSwitching, setIsSwitching] = useState<boolean>(false);

    const [selected, setSelected] = useState<string>(String(curr));

    function switchImage(val?: string) {
        const target = val ? Number(val) : 1;
        setNext(target);
        setIsSwitching(true);
        setSelected(String(target));
        setTimeout(() => {
            console.log("Switching to", val);
            setCurr(target);
            setIsSwitching(false);
        }, 500);
    }

    useEffect(() => {
        const imagesCount = 3;
        const id = setInterval(() => {
            const nextIndex = (curr % imagesCount) + 1;
            switchImage(String(nextIndex));
        }, 5000);
        return () => clearInterval(id);
    }, [curr]);

    return (
        <>
            <div className="school-carousel">
                <Image
                    className={"school-carousel-curr" + (isSwitching ? " switch" : "")}
                    src={`/images/school-carousel/${curr}.png`}
                    alt=""
                    fill
                />
                <Image className="school-carousel-next" src={`/images/school-carousel/${next}.png`} alt="" fill />
            </div>

            <ToggleGroup.Root
                type="single"
                className="school-carousel-group"
                value={selected}
                onValueChange={(val) => {
                    // val may be undefined; guard and call switchImage
                    if (val) switchImage(val);
                }}
            >
                <ToggleGroup.Item className="school-carousel-items" value="1" />
                <ToggleGroup.Item className="school-carousel-items" value="2" />
                <ToggleGroup.Item className="school-carousel-items" value="3" />
            </ToggleGroup.Root>
        </>
    );
}
