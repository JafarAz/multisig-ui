import { useState, useEffect, useContext } from "react"
import { ChainContext } from "../Context"
import ButtonList from "../input/ButtonList"
import { useRouter } from "next/router";
import { Tooltip } from "antd";
import { openLoadingNotification, openNotification } from "../ulti/Notification"
import { prefixToId } from "../../data/chainData"
import { Skeleton } from "antd"
import axios from "axios";
import { timeStampHandler } from "../../libs/stringConvert";
import { motion } from "framer-motion"
import Link from "next/link"
import TransactionFilterButton from "../input/TransactionFIlterButton";
import { ShareAltOutlined, LinkOutlined } from "@ant-design/icons";
import Button from "../input/Button";
import CopyToClipboard from "react-copy-to-clipboard";
import FlexRow from "../flex_box/FlexRow";
import { ReloadOutlined, DeleteOutlined } from "@ant-design/icons";
import { deleteTransaction } from "../../libs/faunaClient"
import EmptyPage from "../ulti/EmptyPage";
import { fromBase64, toBech32 } from "@cosmjs/encoding"
import { rawSecp256k1PubkeyToRawAddress } from "@cosmjs/tendermint-rpc"
import { PublicKey } from "@injectivelabs/sdk-ts";

const style = {
    actionButton: {
        border: 0,
        backgroundColor: "transparent",
        padding: 5,
        fontSize: "1rem",
    },
}

const TransactionList = ({ multisig }) => {
    const [transactions, setTransactions] = useState([])
    const [filterTransactions, setFilterTransactions] = useState([])
    const [viewTransactions, setViewTransactions] = useState([])
    const [loading, setLoading] = useState(false)
    const [params, setParams] = useState({
        page: 1,
        limit: 10,
        total: 0,
    })
    const [filter, setFilter] = useState("")
    const [spin, setSpin] = useState(false)
    const [toggleReload, setToggleReload] = useState(false)
    const { chain, wrapper } = useContext(ChainContext)
    const router = useRouter()
    const { multisigID } = router.query

    const wrapSetParams = (index) => {
        setParams({ ...params, page: index })
    }

    const compare = (a, b) => {
        if (a.createdOn > b.createdOn) {
            return -1;
        }
        if (a.createdOn < b.createdOn) {
            return 1;
        }
        // a must be equal to b
        return 0;
    }

    useEffect(() => {
        (async () => {
            if (!multisigID) return
            setLoading(true)
            try {
                const current = localStorage.getItem("current")
                const id = prefixToId[`${multisig.prefix}`]
                if (parseInt(current, 10) !== id) {
                    wrapper(id)
                    localStorage.setItem("current", id)
                }
                let { data } = await axios.get(`/api/multisig/${multisigID}/all-transaction`)
                data = data.sort(compare)
                setTransactions([...data])
                setFilter("all")
                setLoading(false)
                setSpin(false)
            }
            catch (e) {
                setSpin(false)
                openNotification("error", e.message)
            }
        })()
    }, [multisigID, toggleReload])

    useEffect(() => {
        setSpin(true)
        setParams({
            ...params,
            page: 1
        })
    }, [toggleReload])

    const checkUserPriviledge = () => {
        const currentUserStr = localStorage.getItem("account")
        const user = JSON.parse(currentUserStr)
        const pubkeyJson = JSON.parse(multisig.pubkeyJSON)
        console.log("checkUserPriviledge");
        const pubkeyListFromJSON = pubkeyJson.value.pubkeys
        const listAddrs = pubkeyListFromJSON.map(pub => {
            if (chain.chain_id.startsWith('evmos')) {
                const pk = PublicKey.fromBase64(fromBase64(pub.value))
                pk.type = '/ethermint.crypto.v1.ethsecp256k1.PubKey'
                const addr = pk.toAddress().toBech32('evmos')
                return addr
            }
            else if (chain.chain_id.startsWith('injective')) {
                const pk = PublicKey.fromBase64(fromBase64(pub.value))
                pk.type = '/injective.crypto.v1beta1.ethsecp256k1.PubKey'
                const addr = pk.toAddress().toBech32('inj')
                return addr
            }
            else {
                const addrUint8Array = fromBase64(pub.value)
                const rawAddr = rawSecp256k1PubkeyToRawAddress(addrUint8Array)
                const addr = toBech32(multisig.prefix, rawAddr)
                return addr
            }
        })
        const checkComponent = listAddrs.some(
            (addr) => addr === user.bech32Address
        );
        return checkComponent
    }

    useEffect(() => {
        (async () => {
            setLoading(true)
            try {
                const filterTxs = filter === "all" ? filter !== "" && [...transactions] : transactions.filter(tx => tx.status === filter.toUpperCase())
                setFilterTransactions([...filterTxs])
                setParams({
                    ...params,
                    total: filterTxs.length,
                    page: 1
                })
                setLoading(false)
            }
            catch (e) {
                openNotification("error", e.message)
            }
        })()
    }, [filter, transactions])

    useEffect(() => {
        const pagingList = filterTransactions.slice((params.page - 1) * params.limit, params.page * params.limit)
        setViewTransactions([...pagingList])
    }, [params, filterTransactions])

    const getType = (msg) => {
        const type = msg.typeUrl
        return type.split("Msg")[1]
    }

    const removeTransaction = async (id) => {
        try {
            openLoadingNotification("open", "Deleting transaction")
            const check = checkUserPriviledge()
            console.log(check)
            if (check) {
                await deleteTransaction(id)
                const newFilterTransactions = transactions.filter((tx) => tx._id !== id)
                setTransactions([...newFilterTransactions])
                openLoadingNotification("close")
                openNotification("success", "Successfully delete transaction")
            }
            else {
                throw new Error("Not a comoponent account")
            }
        }
        catch (e) {
            openLoadingNotification("close")
            openNotification("error", "Unsuccessfully delete transaction " + e.message)
        }
    }

    return (
        <>
            <TransactionFilterButton
                currentFilter={filter}
                setFilter={setFilter}
            />
            <div
                style={{
                    padding: "1em 2em",
                    display: "flex",
                    justifyContent: "space-between",
                    flexDirection: "column",
                    backgroundColor: "#ffffff",
                    width: "100%",
                    borderRadius: "0 30px 30px 30px",
                    position: "relative",
                    zIndex: 3,
                    boxShadow: "0px 0px 20px 2px rgba(0, 0, 0, 0.25)",
                    minHeight: "70vh"
                }}
            >
                <div>
                    <FlexRow
                        components={[
                            <h1
                                style={{
                                    textAlign: "left",
                                }}
                            >
                                Transactions
                            </h1>,
                            <Button
                                text={(
                                    <div>
                                        <ReloadOutlined
                                            spin={spin}
                                        /> Update
                                    </div>
                                )}
                                style={{
                                    position: "relative",
                                    top: "5px",
                                    color: "white",
                                    backgroundColor: "rgb(0, 0, 0, 0.5)",
                                    borderRadius: "10px",
                                    border: 0,
                                    height: "40px",
                                    padding: "0 2em",
                                }}
                                clickFunction={() => {
                                    setToggleReload(!toggleReload)
                                }}
                            />
                        ]}
                        justifyContent={"space-between"}
                    />
                    <table
                        style={{
                            width: "100%",
                            borderSpacing: "0 1em",
                        }}
                    >
                        <thead
                            style={{
                                borderBottom: "solid 1.5px black",
                                fontSize: "1.25rem",
                            }}
                        >
                            <tr>
                                <th
                                    style={{
                                        width: "20%",
                                        padding: ".5em",
                                        textAlign: "left"
                                    }}
                                >
                                    ID
                                </th>
                                <th
                                    style={{
                                        width: "20%",
                                        padding: ".5em",
                                        textAlign: "left"
                                    }}
                                >
                                    Type(s)
                                </th>
                                <th
                                    style={{
                                        width: "20%",
                                        padding: ".5em",
                                        textAlign: "left"
                                    }}
                                >
                                    Status
                                </th>
                                <th
                                    style={{
                                        width: "20%",
                                        padding: ".5em",
                                        textAlign: "left",
                                    }}
                                >
                                    Created At
                                </th>
                                <th
                                    style={{
                                        width: "20%",
                                        padding: ".5em",
                                        textAlign: "right",
                                    }}
                                >
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <motion.tbody
                            animate={{
                                transition: {
                                    staggerChildren: 0.1
                                }
                            }}
                        >
                            {
                                !loading ? viewTransactions.map((transaction, index) => {
                                    return (
                                        <motion.tr
                                            initial={{
                                                y: 60,
                                                opacity: 0,
                                                transition: { duration: .6, ease: [0.6, -0.05, 0.01, 0.99] }
                                            }}
                                            animate={{
                                                y: 0,
                                                opacity: 1,
                                                transition: {
                                                    duration: .6,
                                                    ease: [0.6, -0.05, 0.01, 0.99]
                                                }
                                            }}
                                            whileHover={{ scale: 1.02 }}
                                            key={index}
                                            style={{
                                                width: "100%",
                                                borderBottom: "solid .25px #d6d6d6",
                                                marginBottom: "5px"
                                            }}
                                        >
                                            {
                                                transaction !== null && (
                                                    <>
                                                        <motion.td
                                                            whileTap={{ scale: 0.9 }}
                                                            style={{
                                                                width: "30%",
                                                                fontSize: "1rem",
                                                                padding: "1em 0.5em"
                                                            }}
                                                        >
                                                            <Link
                                                                href={`/multisig/${multisigID}/transaction/${transaction._id}`}
                                                            >
                                                                {transaction._id}
                                                            </Link>
                                                        </motion.td>
                                                        <motion.td
                                                            whileTap={{ scale: 0.9 }}
                                                            style={{
                                                                fontSize: "1rem",
                                                                padding: "1em 0.5em",
                                                                display: 'block',
                                                                overflow: 'auto',
                                                                height: '60px',
                                                            }}
                                                        >
                                                            {
                                                                JSON.parse(transaction.dataJSON).msgs.map((msg, i) => {
                                                                    return (
                                                                        <div
                                                                            key={i}
                                                                            style={{
                                                                                width: '100%'
                                                                            }}
                                                                        >
                                                                            {getType(msg)}
                                                                        </div>
                                                                    )
                                                                })
                                                            }
                                                        </motion.td>
                                                        <motion.td
                                                            whileTap={{ scale: 0.9 }}
                                                            style={{
                                                                width: "20%",
                                                                padding: "1em 0.5em",
                                                                fontSize: "1rem",
                                                                textAlign: "left"
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    width: "10%",
                                                                    aspectRatio: "1/1",
                                                                    backgroundColor: transaction.status === "PENDING" ? "#D82D2C" : "#189A01",
                                                                    borderRadius: "50%",
                                                                    display: "inline-block",
                                                                    margin: "auto 10px",
                                                                    position: "relative",
                                                                    top: "3px"
                                                                }}
                                                            />
                                                            <span
                                                                style={{
                                                                    margin: "auto 0"
                                                                }}
                                                            >
                                                                {transaction.status}
                                                            </span>
                                                        </motion.td>
                                                        <motion.td
                                                            whileTap={{ scale: 0.9 }}
                                                            style={{
                                                                width: "20%",
                                                                textAlign: "left",
                                                                fontSize: "1rem",
                                                                padding: "1em 0.5em"
                                                            }}
                                                        >
                                                            {timeStampHandler(new Date(transaction.createdOn))}
                                                        </motion.td>
                                                        <td
                                                            style={{
                                                                width: "20%",
                                                                textAlign: "center",
                                                                fontSize: "1rem",
                                                                padding: "1em 0.5em"
                                                            }}
                                                        >
                                                            <Tooltip placement="top" title="Share transaction">
                                                                <CopyToClipboard
                                                                    text={`${process.env.NEXT_PUBLIC_HOST}/multisig/${multisigID}/transaction/${transaction._id}`}
                                                                    onCopy={() => {
                                                                        openNotification("success", "Copy to clipboard !")
                                                                    }}
                                                                    style={style.actionButton}
                                                                >
                                                                    <ShareAltOutlined />
                                                                </CopyToClipboard>
                                                            </Tooltip>
                                                            {
                                                                transaction.txHash && (
                                                                    <Tooltip
                                                                        placement="top"
                                                                        title="View in block explorer"
                                                                    >
                                                                        <a
                                                                            href={`${chain.txExplorer}${transaction.txHash}`}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            style={style.actionButton}
                                                                        >
                                                                            <LinkOutlined />
                                                                        </a>
                                                                    </Tooltip>
                                                                )
                                                            }
                                                            {
                                                                !transaction.txHash && (
                                                                    <Tooltip
                                                                        placement="top"
                                                                        title="Delete"
                                                                    >
                                                                        <button
                                                                            onClick={(async () => await removeTransaction(transaction._id))}
                                                                            style={style.actionButton}
                                                                        >
                                                                            <DeleteOutlined />
                                                                        </button>
                                                                    </Tooltip>
                                                                )
                                                            }
                                                        </td>
                                                    </>
                                                )
                                            }
                                        </motion.tr>
                                    )
                                }) : (
                                    <>
                                        <td
                                            style={{
                                                width: "30%",
                                                paddingTop: "1em"
                                            }}
                                        >
                                            <Skeleton active rows={1} paragraph={{ rows: 0 }} />
                                        </td>
                                        <td
                                            style={{
                                                width: "30%",
                                                paddingTop: "1em"
                                            }}
                                        >
                                            <Skeleton active rows={1} paragraph={{ rows: 0 }} />
                                        </td>
                                        <td
                                            style={{
                                                width: "20%",
                                                paddingTop: "1em"
                                            }}
                                        >
                                            <Skeleton active rows={1} paragraph={{ rows: 0 }} />
                                        </td>
                                        <td
                                            style={{
                                                width: "20%",
                                                paddingTop: "1em"
                                            }}
                                        >
                                            <Skeleton active rows={1} paragraph={{ rows: 0 }} />
                                        </td>
                                    </>
                                )
                            }
                        </motion.tbody>
                    </table>
                    {
                        !loading && viewTransactions.length === 0 && (
                            <EmptyPage
                                description={(
                                    <div>
                                        No transactions found
                                    </div>
                                )}
                            />
                        )
                    }
                </div>
                {
                    params.total > 0 && (
                        <ButtonList
                            currentPage={params.page}
                            total={Math.ceil(params.total / params.limit)}
                            wrapSetParams={wrapSetParams}
                        />
                    )
                }
            </div>
        </>
    )
}

export default TransactionList