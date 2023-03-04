import { useEffect, useState } from "react"
import { getValidators } from "../../../libs/queryClients"
import Input from "../../input/Input"
import { createDelegateMsg } from "../../../libs/transaction"
import { openNotification } from "../../ulti/Notification"
import { convertValueFromDenom } from "../../../libs/stringConvert"
import Button from "../../input/Button"
import { InputNumber } from 'antd';


const DelegateMsg = ({ chain, address, msgs, setMsgs, style }) => {
    const [validators, setValidators] = useState([])
    const [txBody, setTxBody] = useState({
        toAddress: "",
        amount: 0,
    })

    const invalidForm = () => {
        for (let key in txBody) {
            if (key === "amount" && txBody[key] === 0) return true
        }
        return false
    }

    const disabled = () => {
        if (invalidForm()) {
            return true
        }
        return false
    }

    useEffect(() => {
        (async () => {
            try {
                const res = await getValidators(chain.rpc)
                res.validators && setValidators([...res.validators])
            }
            catch (e) {
                openNotification("error", e.message)
            }
        })()
    }, [chain])

    const createMsg = () => {
        try {
            const msg = createDelegateMsg(
                address,
                txBody.toAddress,
                convertValueFromDenom(chain.base_denom, txBody.amount),
                chain.denom
            )
            setMsgs([...msgs, msg])
            openNotification('success', 'Adding successfully')
        }
        catch (e) {
            openNotification('success', 'Adding unsuccessfully')
        }
    }

    const handleInputNumber = (val) => {
        setTxBody({
            ...txBody,
            amount: parseFloat(val)
        })
    }

    const handleSelect = (e) => {
        setTxBody({
            ...txBody,
            toAddress: e.target.value
        })
    }

    return (
        <div>
            <div
                style={style.input}
            >
                <h4
                    style={{
                        marginBottom: 0
                    }}
                >
                    Validator
                </h4>
                <select
                    onChange={handleSelect}
                    style={{
                        width: "100%",
                        padding: "1em",
                        borderRadius: "10px",
                    }}
                >
                    {
                        validators.length > 0 && validators.map((validator, index) => {
                            return (
                                <option
                                    value={validator.operatorAddress}
                                    key={index}
                                >
                                    {validator.description.moniker}
                                </option>
                            )
                        })
                    }
                </select>

            </div>
            <div>
                <h4
                    style={{
                        margin: 0
                    }}
                >
                    {`Amount (${chain.denom.substring(1).toUpperCase()})`}
                </h4>
                <InputNumber
                    onChange={handleInputNumber}
                    value={txBody.amount}
                    label={`Amount (${chain.denom.substring(1).toUpperCase()})`}
                    name="amount"
                    placeholder="Amount"
                    style={{
                        ...style.input,
                        width: "100%",
                        borderRadius: "10px",
                        border: "solid 1px black",
                        padding: "10px"
                    }}
                />
            </div>
            <Button
                text={"Add Message"}
                style={{
                    backgroundColor: disabled() ? "#808080" : "black",
                    color: "white",
                    padding: "1em",
                    width: "100%",
                    borderRadius: "10px",
                    marginTop: "20px",
                    border: 0
                }}
                clickFunction={createMsg}
                disable={disabled()}
            />
        </div>
    )
}

export default DelegateMsg