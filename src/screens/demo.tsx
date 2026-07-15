import React from 'react'

interface propType {
    propA: string,
    propB: string,
    propC: number
}

const demo = (props: propType) => {
    const { propA, propB, propC } = props;
    console.log("-->", propA, propB, propC);

    function hello(prop: string): string {
        return prop;

    }
    const handlePress = (e: React.MouseEvent<HTMLDivElement>, prop: string) => {
        console.log(prop, e)
    }
    return (
        <>
            <div onClick={(e) => handlePress(e, propA)}>demo</div>
            <div onClick={() => hello(propA)}>demo</div>
        </>
    )
}

export default demo
